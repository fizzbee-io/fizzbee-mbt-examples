// Generated scaffold by fizzbee-mbt generator
// Source: ../specs/simple-counter/counter.fizz
// Update the methods with your implementation.
package counter

import (
	"context"
	"database/sql"
	simplecounter "fizzbee-mbt-quickstart"
	"flag"

	mbt "github.com/fizzbee-io/fizzbee/mbt/lib/go"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

// Role adaptors

// CounterRoleAdapter is a stub adaptor for CounterRole
type CounterRoleAdapter struct {
	counter simplecounter.Counter
}

// Assert that CounterRoleAdapter satisfies CounterRole
var _ CounterRole = (*CounterRoleAdapter)(nil)

func (a *CounterRoleAdapter) ActionInc(args []mbt.Arg) (any, error) {
	err := a.counter.Inc(context.Background())
	return nil, err
}

func (a *CounterRoleAdapter) ActionGet(args []mbt.Arg) (any, error) {
	return a.counter.Get(context.Background())
}

func (a *CounterRoleAdapter) ActionDec(args []mbt.Arg) (any, error) {
	err := a.counter.Dec(context.Background())
	return nil, err
}

// Model adaptor
type CounterModelAdapter struct {
	counterRole *CounterRoleAdapter
}

// Assert that CounterModelAdapter satisfies CounterModel
var _ CounterModel = (*CounterModelAdapter)(nil)

// Constructor for CounterModelAdapter
func NewCounterModel() CounterModel {
	return &CounterModelAdapter{}
}

func GetTestOptions() map[string]any {
	return map[string]any{
		"max-seq-runs":      1000,
		"max-parallel-runs": 1000,
		"max-actions":       20,
	}
}

func (m *CounterModelAdapter) GetState() (map[string]any, error) {
	// TODO: implement GetState. Required.
	return nil, mbt.ErrNotImplemented
}

func (m *CounterModelAdapter) GetRoles() (map[mbt.RoleId]mbt.Role, error) {
	roles := map[mbt.RoleId]mbt.Role{
		{RoleName: "Counter", Index: 0}: m.counterRole,
	}
	return roles, nil
}

func (m *CounterModelAdapter) Init() error {
	var counter simplecounter.Counter
	if useMemCounter {
		counter = simplecounter.NewMemCounter(3)
	} else {
		ctx := context.Background()
		db, err := sql.Open("postgres", "postgres://postgres:mysecretpassword@localhost:5432/postgres?sslmode=disable")
		if err != nil {
			return err
		}
		counter, err = simplecounter.NewPGCounter(ctx, db, "counter-"+uuid.New().String(), 3)
		if err != nil {
			return err
		}
	}
	m.counterRole = &CounterRoleAdapter{
		counter: counter,
	}
	return nil
}

func (m *CounterModelAdapter) Cleanup() error {
	if m.counterRole != nil && !useMemCounter {
		pgCounter := m.counterRole.counter.(*simplecounter.PGCounter)
		pgCounter.DeleteCounter()
		pgCounter.Close()
	}
	return nil
}

var useMemCounter bool

func init() {
	// define a flag to choose whether MemCounter or PGCounter is used
	flag.BoolVar(&useMemCounter, "use-mem-counter", false, "Use in-memory counter instead of PostgreSQL")
}
