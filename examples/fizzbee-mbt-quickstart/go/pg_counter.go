package simplecounter

import (
	"context"
	"database/sql"
	"fmt"
)

type PGCounter struct {
	db   *sql.DB
	name string
	max  int
}

// NewPGCounter initializes or fetches an existing counter with the given name.
func NewPGCounter(ctx context.Context, db *sql.DB, name string, max int) (*PGCounter, error) {
	// Try to insert the counter; if it already exists, do nothing.
	_, err := db.ExecContext(ctx, `
        INSERT INTO counters (name, value, max)
        VALUES ($1, 0, $2)
        ON CONFLICT (name) DO NOTHING
    `, name, max)
	if err != nil {
		return nil, fmt.Errorf("failed to init counter: %w", err)
	}

	return &PGCounter{db: db, name: name, max: max}, nil
}

// update performs the delta update (+1 or -1) safely with max checks.
func (c *PGCounter) update(ctx context.Context, delta int) error {
	_, err := c.db.ExecContext(ctx, `
        UPDATE counters
        SET value = value + $1
        WHERE name = $2
          AND value + $1 >= 0
          AND value + $1 <= max
    `, delta, c.name)

	return err
}

func (c *PGCounter) Inc(ctx context.Context) error {
	return c.update(ctx, 1)
}

func (c *PGCounter) Dec(ctx context.Context) error {
	return c.update(ctx, -1)
}

func (c *PGCounter) Get(ctx context.Context) (int, error) {
	var value int
	err := c.db.QueryRowContext(ctx, `
        SELECT value
        FROM counters
        WHERE name = $1
    `, c.name).Scan(&value)
	if err != nil {
		return 0, fmt.Errorf("get counter: %w", err)
	}
	return value, nil
}

func (c *PGCounter) Close() error {
	return c.db.Close()
}

func (c *PGCounter) DeleteCounter() error {
	_, err := c.db.ExecContext(context.Background(), `
        DELETE FROM counters
        WHERE name = $1
    `, c.name)
	return err
}

var _ Counter = (*PGCounter)(nil)
