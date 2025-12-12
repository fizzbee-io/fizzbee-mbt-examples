package org.example.todo;

import io.fizzbee.mbt.types.RoleMapper;
import io.fizzbee.mbt.types.Role;
import io.fizzbee.mbt.types.RoleId;
import io.fizzbee.mbt.types.NotImplementedException;
import io.fizzbee.mbt.types.Arg;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Map;

public class TodoModelAdapter implements TodoModel, RoleMapper {
    private static final String DB_URL = "jdbc:sqlite:/Users/jp/src/todo-golang/test.db";
    TodoAppRoleAdapter todoAdapter;
//    int traceCounter = 0;
    @Override
    public void init() throws NotImplementedException {
        if (todoAdapter != null) {
            todoAdapter.open();
            return;
        }
        cleanupDb();
        todoAdapter = new TodoAppRoleAdapter();
    }

    @Override
    public void cleanup() throws NotImplementedException {
//        todoAdapter.logout();
        todoAdapter.close();
        cleanupDb();
//        System.out.print("\r--- Trace Complete: " + (++traceCounter) + " ---");
//        System.out.flush();
    }

    private void cleanupDb() {
        clearTodos();
    }
    public static void clearTodos() {
        try (Connection conn = DriverManager.getConnection(DB_URL);
             Statement stmt = conn.createStatement()) {
            stmt.execute("PRAGMA busy_timeout = 3000;");
            stmt.executeUpdate("DELETE FROM todos;");

            // Reset the auto-incrementing primary key
            stmt.executeUpdate("DELETE FROM sqlite_sequence WHERE name='todos';");
        } catch (SQLException e) {
            e.printStackTrace();
            throw new RuntimeException("Failed to clean up todos", e);
        }

    }
    @Override
    public Map<RoleId, Role> getRoles() {
        return Map.of(new RoleId("TodoApp", 0), todoAdapter);
    }
}
