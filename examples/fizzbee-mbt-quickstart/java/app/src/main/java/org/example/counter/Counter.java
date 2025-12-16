package org.example.counter;

public interface Counter {
    void inc() throws Exception;

    void dec() throws Exception;

    int get() throws Exception;
}