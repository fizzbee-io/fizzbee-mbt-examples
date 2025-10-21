package org.example.counter;

import java.util.concurrent.locks.ReentrantLock;

public class MemCounter implements Counter {
    private final ReentrantLock lock = new ReentrantLock();
    private final int limit;
    private int value;

    public MemCounter(int limit) {
        this.limit = limit;
        this.value = 0;
    }

    @Override
    public synchronized void inc() {
        value = Integer.min(value + 1, limit);
    }

    @Override
    public synchronized void dec() {
        value = Integer.max(value - 1, 0);
    }

    @Override
    public synchronized int get() {
        return value;
    }
}
