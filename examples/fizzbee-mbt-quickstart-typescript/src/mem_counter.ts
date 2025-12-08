import { Counter } from './counter.js';

/**
 * MemCounter implements Counter using in-memory storage.
 *
 * Note: Since JavaScript/TypeScript runs on a single-threaded event loop,
 * synchronous operations don't need locks. However, if you introduce async
 * operations between reads and writes, race conditions can occur.
 */
export class MemCounter implements Counter {
  private limit: number;
  private value: number = 0;

  constructor(limit: number) {
    this.limit = limit;
  }

  async inc(): Promise<void> {
    if (this.value < this.limit) {
      this.value++;
    }
  }

  async dec(): Promise<void> {
    if (this.value > 0) {
      this.value--;
    }
  }

  async get(): Promise<number> {
    return this.value;
  }
}
