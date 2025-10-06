package simplecounter

import "sync"

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

func (c *MemCounter) Inc() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.value < c.limit {
		c.value++
	}
}
func (c *MemCounter) Dec() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.value > 0 {
		c.value--
	}
}
func (c *MemCounter) Get() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.value
}
