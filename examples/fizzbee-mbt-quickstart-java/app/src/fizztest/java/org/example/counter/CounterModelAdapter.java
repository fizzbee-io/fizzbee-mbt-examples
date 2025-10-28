package org.example.counter;

import io.fizzbee.mbt.types.RoleMapper;
import io.fizzbee.mbt.types.Role;
import io.fizzbee.mbt.types.RoleId;
import io.fizzbee.mbt.types.NotImplementedException;
import io.fizzbee.mbt.types.Arg;
import java.util.Map;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.UUID;

public class CounterModelAdapter implements CounterModel, RoleMapper {

    private PgCounter pgCounter;
    private CounterRole counterRole;
    public CounterModelAdapter() {

    }
    @Override
    public void init() {
        try {
            // Open connection to PostgreSQL
            Connection db = DriverManager.getConnection(
                    "jdbc:postgresql://localhost:5432/postgres",
                    "postgres",
                    "mysecretpassword"
            );

            // Create a new PGCounter
            String name = "counter-" + UUID.randomUUID();
            this.pgCounter = new PgCounter(db, name, 3);
            this.counterRole = new CounterRoleAdapter(pgCounter);
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public void cleanup() {
        try {
            pgCounter.cleanup();
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public Map<RoleId, Role> getRoles() {
        return Map.of(new RoleId("Counter", 0), counterRole);
    }
}