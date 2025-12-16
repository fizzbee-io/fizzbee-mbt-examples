package simplecounter

import (
	"context"
)

// Counter is a simple counter interface with Inc, Dec, and Get methods.
type Counter interface {
	Inc(ctx context.Context) error
	Dec(ctx context.Context) error
	Get(ctx context.Context) (int, error)
}
