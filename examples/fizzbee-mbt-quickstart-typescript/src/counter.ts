/**
 * Counter is a simple counter interface with Inc, Dec, and Get methods.
 */
export interface Counter {
  /**
   * Increment the counter by 1 if it's below the limit.
   */
  inc(): Promise<void>;

  /**
   * Decrement the counter by 1 if it's above 0.
   */
  dec(): Promise<void>;

  /**
   * Get the current value of the counter.
   */
  get(): Promise<number>;
}
