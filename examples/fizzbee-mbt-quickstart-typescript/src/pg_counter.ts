import { Pool, PoolClient } from 'pg';
import { Counter } from './counter.js';

/**
 * PGCounter implements Counter using PostgreSQL as the backend.
 */
export class PGCounter implements Counter {
  private pool: Pool;
  private name: string;
  private max: number;

  private constructor(pool: Pool, name: string, max: number) {
    this.pool = pool;
    this.name = name;
    this.max = max;
  }

  /**
   * Create a new PGCounter or fetch an existing one with the given name.
   */
  static async create(pool: Pool, name: string, max: number): Promise<PGCounter> {
    // Try to insert the counter; if it already exists, do nothing.
    await pool.query(
      `
      INSERT INTO counters (name, value, max)
      VALUES ($1, 0, $2)
      ON CONFLICT (name) DO NOTHING
      `,
      [name, max]
    );

    return new PGCounter(pool, name, max);
  }

  /**
   * Perform a delta update (+1 or -1) with race condition.
   *
   * BUGGY VERSION: This has a race condition!
   * It reads the value, checks in memory, then writes back.
   * Two concurrent operations can both read the same value and both update,
   * causing the counter to exceed limits or go negative.
   */
  // private async update(delta: number): Promise<void> {
  //   // Get current value
  //   const result = await this.pool.query<{ value: number; max: number }>(
  //     `
  //     SELECT value, max
  //     FROM counters
  //     WHERE name = $1
  //     `,
  //     [this.name]
  //   );

  //   if (result.rows.length === 0) {
  //     return; // Counter doesn't exist
  //   }

  //   const currentValue = result.rows[0].value;
  //   const maxValue = result.rows[0].max;
  //   const newValue = currentValue + delta;

  //   // Check constraints in memory (RACE CONDITION HERE!)
  //   if (newValue >= 0 && newValue <= maxValue) {
  //     // Update without constraints - another operation might have changed value!
  //     await this.pool.query(
  //       `
  //       UPDATE counters
  //       SET value = $1
  //       WHERE name = $2
  //       `,
  //       [newValue, this.name]
  //     );
  //   }
  // }

  /**
   * CORRECT VERSION (commented out):
   * Perform a delta update (+1 or -1) safely with max checks.
   * This version is atomic - it checks and updates in a single query.
   */
  private async update(delta: number): Promise<void> {
    await this.pool.query(
      `
      UPDATE counters
      SET value = value + $1
      WHERE name = $2
        AND value + $1 >= 0
        AND value + $1 <= max
      `,
      [delta, this.name]
    );
  }

  async inc(): Promise<void> {
    await this.update(1);
  }

  async dec(): Promise<void> {
    await this.update(-1);
  }

  async get(): Promise<number> {
    const result = await this.pool.query<{ value: number }>(
      `
      SELECT value
      FROM counters
      WHERE name = $1
      `,
      [this.name]
    );

    if (result.rows.length === 0) {
      throw new Error(`Counter ${this.name} not found`);
    }

    return result.rows[0].value;
  }

  /**
   * Close the database connection pool.
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Delete this counter from the database.
   */
  async deleteCounter(): Promise<void> {
    await this.pool.query(
      `
      DELETE FROM counters
      WHERE name = $1
      `,
      [this.name]
    );
  }
}
