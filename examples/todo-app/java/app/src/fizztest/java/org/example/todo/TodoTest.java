package org.example.todo;

import io.fizzbee.mbt.types.Model;
import org.junit.jupiter.api.AfterAll;

import java.util.Map;

public class TodoTest extends TodoTestBase {

    @Override
    protected Model newModel() {
        return new TodoModelAdapter();
    }

    @Override
    protected Map<String, Object> getConfig() {
        return Map.of(
                "max-seq-runs", 1000,
                "max-parallel-runs", 0,
                "max-actions", 10
        );
    }
}