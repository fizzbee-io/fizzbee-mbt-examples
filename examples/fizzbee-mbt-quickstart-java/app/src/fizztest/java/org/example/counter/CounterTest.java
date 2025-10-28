package org.example.counter;

import io.fizzbee.mbt.types.Model;
import java.util.Map;

public class CounterTest extends CounterTestBase {

    @Override
    protected Model newModel() {
        return new CounterModelAdapter();
    }

    @Override
    protected Map<String, Object> getConfig() {
        return Map.of(
                "max-seq-runs", 1000,
                "max-parallel-runs", 1000,
                "max-actions", 10
        );
    }
}