package writer

import (
	"sync"
)

type BufferedWriter struct {
	mu       sync.Mutex
	flushed  []int
	buffered []int
}

func (bw *BufferedWriter) State() (any, any) {
	return bw.buffered, bw.flushed
}

func NewBufferedWriter() *BufferedWriter {
	return &BufferedWriter{
		flushed:  make([]int, 0),
		buffered: make([]int, 0),
	}
}

// Append is atomic: adds x to buffered.
func (bw *BufferedWriter) Append(x int) {
	bw.mu.Lock()
	defer bw.mu.Unlock()
	bw.buffered = append(bw.buffered, x)
}

// Flush is atomic: moves all buffered to flushed and clears buffered.
func (bw *BufferedWriter) Flush() {
	bw.mu.Lock()
	defer bw.mu.Unlock()
	bw.flushed = append(bw.flushed, bw.buffered...)
	bw.buffered = bw.buffered[:0]
}

// GetLength returns total number of items.
func (bw *BufferedWriter) GetLength() int {
	bw.mu.Lock()
	defer bw.mu.Unlock()
	return len(bw.flushed) + len(bw.buffered)
}
