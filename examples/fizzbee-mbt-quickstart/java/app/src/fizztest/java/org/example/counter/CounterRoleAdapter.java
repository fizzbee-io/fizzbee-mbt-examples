package org.example.counter;

import io.fizzbee.mbt.types.Arg;
import io.fizzbee.mbt.types.NotImplementedException;
import java.sql.SQLException;

public class CounterRoleAdapter implements CounterRole {

    private final PgCounter pgCounter;

    public CounterRoleAdapter(PgCounter pgCounter) {
        this.pgCounter = pgCounter;
    }

    @Override
    public Object actionInc(Arg[] args) throws NotImplementedException {
        try {
            pgCounter.inc();
            return null;
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public Object actionGet(Arg[] args) throws NotImplementedException {
        try {
            return pgCounter.get();
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public Object actionDec(Arg[] args) throws NotImplementedException {
        try {
            pgCounter.dec();
            return null;
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }
}
