package simplecounter

import (
	"context"
	"sync"
)

type MemCounter struct {
	mu sync.Mutex
	// limit is the maximum value of the counter
	limit int
	// value is the current value of the counter
	value int
}

// NewMemCounter creates a new MemCounter with the given limit.
func NewMemCounter(limit int) *MemCounter {
	return &MemCounter{limit: limit}
}

func (c *MemCounter) Inc(_ context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.value < c.limit {
		c.value++
	}
	return nil
}

func (c *MemCounter) Dec(_ context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.value > 0 {
		c.value--
	}
	return nil
}
func (c *MemCounter) Get(_ context.Context) (int, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.value, nil
}

var _ Counter = (*MemCounter)(nil)
