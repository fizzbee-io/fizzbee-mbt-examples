package org.example.counter;

import java.sql.*;

public class PgCounter implements Counter, AutoCloseable {
    private final Connection connection;
    private final String name;
    private final int max;

    public PgCounter(Connection connection, String name, int max) throws SQLException {
        this.connection = connection;
        this.name = name;
        this.max = max;

        try (PreparedStatement stmt = connection.prepareStatement("""
            INSERT INTO counters (name, value, max)
            VALUES (?, 0, ?)
            ON CONFLICT (name) DO NOTHING
        """)) {
            stmt.setString(1, name);
            stmt.setInt(2, max);
            stmt.executeUpdate();
        }
    }

    @Override
    public void inc() throws SQLException {
        update(1);
    }

    @Override
    public void dec() throws SQLException {
        update(-1);
    }

    @Override
    public int get() throws SQLException {
        try (PreparedStatement stmt = connection.prepareStatement("""
            SELECT value FROM counters WHERE name = ?
        """)) {
            stmt.setString(1, name);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("value");
                } else {
                    throw new SQLException("Counter not found: " + name);
                }
            }
        }
    }

    // ✅ CORRECT: atomic update with bounds check in a single SQL statement
    private void update(int delta) throws SQLException {
        try (PreparedStatement stmt = connection.prepareStatement("""
            UPDATE counters
            SET value = value + ?
            WHERE name = ?
              AND value + ? >= 0
              AND value + ? <= max
        """)) {
            stmt.setInt(1, delta);
            stmt.setString(2, name);
            stmt.setInt(3, delta);
            stmt.setInt(4, delta);
            stmt.executeUpdate();
        }
    }

//    // ⚠️ INCORRECT: subject to race conditions
//    private void update(int delta) throws SQLException {
//        // Step 1: read current value
//        int currentValue = get();
//
//        // Step 2: compute new value in memory (not atomically)
//        int newValue = currentValue + delta;
//
//        // Step 3: enforce bounds check in application logic (not in DB)
//        if (newValue < 0 || newValue > max) {
//            return; // silently ignore or throw exception
//        }
//        // Step 4: write new value back
//        set(newValue);
//    }
//
//    private void set(int newValue) throws SQLException {
//        try (PreparedStatement stmt = connection.prepareStatement("""
//        UPDATE counters
//        SET value = ?
//        WHERE name = ?
//    """)) {
//            stmt.setInt(1, newValue);
//            stmt.setString(2, name);
//            stmt.executeUpdate();
//        }
//    }

    @Override
    public void close() throws SQLException {
        connection.close();
    }

    public void deleteCounter() throws SQLException {
        try (PreparedStatement stmt = connection.prepareStatement("""
            DELETE FROM counters WHERE name = ?
        """)) {
            stmt.setString(1, name);
            stmt.executeUpdate();
        }
    }

    public void cleanup() throws SQLException {
        deleteCounter();
        close();
    }
}