// Generated scaffold by fizzbee-mbt generator
// Source: ../../fizzbee-mbt-quickstart/specs/simple-counter/counter.fizz
// Update the methods with your implementation.

import { Arg, NotImplementedError } from '@fizzbee/mbt';
import { CounterRole, CounterModel } from './counter_interfaces.js';
import { Counter } from '../src/counter.js';
import { MemCounter } from '../src/mem_counter.js';
import { PGCounter } from '../src/pg_counter.js';
import { Pool } from 'pg';

// Role adaptors

export class CounterRoleAdapter implements CounterRole {
  private counter: Counter;

  constructor(counter: Counter) {
    this.counter = counter;
  }

  async actionInc(args: Arg[]): Promise<any> {
    await this.counter.inc();
  }

  async actionGet(args: Arg[]): Promise<any> {
    return await this.counter.get();
  }

  async actionDec(args: Arg[]): Promise<any> {
    await this.counter.dec();
  }
}

// Model adaptor
export class CounterModelAdapter implements CounterModel {
  private counterRole?: CounterRoleAdapter;
  private counter?: Counter;
  private pool?: Pool;
  private useMemCounter: boolean;

  constructor(useMemCounter: boolean = true) {
    this.useMemCounter = useMemCounter;
  }

  async getRoles(): Promise<Map<string, any>> {
    const roles = new Map<string, any>();
    roles.set('Counter#0', this.counterRole);
    return roles;
  }

  async init(): Promise<void> {
    if (this.useMemCounter) {
      this.counter = new MemCounter(3);
    } else {
      // Create PostgreSQL connection pool
      this.pool = new Pool({
        connectionString: 'postgres://postgres:mysecretpassword@localhost:5432/postgres?sslmode=disable'
      });

      // Create counters table if it doesn't exist
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS counters (
          name TEXT PRIMARY KEY,
          value INTEGER NOT NULL,
          max INTEGER NOT NULL
        )
      `);

      // Delete any existing test counter
      await this.pool.query('DELETE FROM counters WHERE name = $1', ['test-counter']);

      // Create a new PGCounter
      this.counter = await PGCounter.create(this.pool, 'test-counter', 3);
    }

    this.counterRole = new CounterRoleAdapter(this.counter);
  }

  async cleanup(): Promise<void> {
    if (!this.useMemCounter && this.pool) {
      // Clean up the test counter
      await this.pool.query('DELETE FROM counters WHERE name = $1', ['test-counter']);
      await this.pool.end();
    }
  }
}

export function newCounterModel(): CounterModel {
  // Parse command-line arguments
  const useMemCounter = process.argv.includes('--use-mem-counter');
  return new CounterModelAdapter(useMemCounter);
}

export function getTestOptions(): Record<string, any> {
  return {
    'max-seq-runs': 1000,
    'max-parallel-runs': 1000,
    'max-actions': 10,
  };
}