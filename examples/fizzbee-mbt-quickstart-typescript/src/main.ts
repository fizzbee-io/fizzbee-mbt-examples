import { Pool } from 'pg';
import { MemCounter } from './mem_counter.js';
import { PGCounter } from './pg_counter.js';

async function testMemCounter() {
  console.log('\n=== Testing MemCounter ===');
  const counter = new MemCounter(5);

  console.log('Initial value:', await counter.get());

  await counter.inc();
  console.log('After inc:', await counter.get());

  await counter.inc();
  await counter.inc();
  console.log('After 2 more inc:', await counter.get());

  await counter.dec();
  console.log('After dec:', await counter.get());

  // Test limit
  await counter.inc();
  await counter.inc();
  await counter.inc();
  console.log('After 3 more inc (should be at limit 5):', await counter.get());

  // This should do nothing as we're at the limit
  await counter.inc();
  console.log('After inc at limit (should still be 5):', await counter.get());

  console.log('✓ MemCounter test completed');
}

async function testPGCounter() {
  console.log('\n=== Testing PGCounter ===');

  // Create PostgreSQL connection pool
  const pool = new Pool({
    connectionString: 'postgres://postgres:mysecretpassword@localhost:5432/postgres?sslmode=disable'
  });

  try {
    // Create counters table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS counters (
        name TEXT PRIMARY KEY,
        value INTEGER NOT NULL,
        max INTEGER NOT NULL
      )
    `);
    console.log('✓ Table created or already exists');

    // Create a counter with name 'test-counter' and max value of 5
    const counter = await PGCounter.create(pool, 'test-counter', 5);
    console.log('✓ Counter created');

    // Clean up any previous test data
    await counter.deleteCounter();
    // Recreate it
    const freshCounter = await PGCounter.create(pool, 'test-counter', 5);

    console.log('Initial value:', await freshCounter.get());

    await freshCounter.inc();
    console.log('After inc:', await freshCounter.get());

    await freshCounter.inc();
    await freshCounter.inc();
    console.log('After 2 more inc:', await freshCounter.get());

    await freshCounter.dec();
    console.log('After dec:', await freshCounter.get());

    // Test limit
    await freshCounter.inc();
    await freshCounter.inc();
    await freshCounter.inc();
    console.log('After 3 more inc (should be at limit 5):', await freshCounter.get());

    // This should do nothing as we're at the limit
    await freshCounter.inc();
    console.log('After inc at limit (should still be 5):', await freshCounter.get());

    // Clean up
    await freshCounter.deleteCounter();
    console.log('✓ Counter deleted');

    await freshCounter.close();
    console.log('✓ PGCounter test completed');

  } catch (error) {
    console.error('Error testing PGCounter:', error);
    await pool.end();
    throw error;
  }
}

async function main() {
  try {
    await testMemCounter();
    await testPGCounter();
    console.log('\n✓ All tests completed successfully!');
  } catch (error) {
    console.error('\n✗ Error:', error);
    process.exit(1);
  }
}

main();
