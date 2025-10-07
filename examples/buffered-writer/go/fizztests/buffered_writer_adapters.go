// Generated scaffold by fizzbee-mbt generator
// Source: ../../fizz/buffered_writer.fizz
// Update the methods with your implementation.
package writer

import (
	writer "buffered-writer"
	"errors"

	mbt "github.com/fizzbee-io/fizzbee/mbt/lib/go"
)

// Role adaptors

// WriterRoleAdapter is a stub adaptor for WriterRole
type WriterRoleAdapter struct {
	bw *writer.BufferedWriter
}

// Assert that WriterRoleAdapter satisfies WriterRole
var _ WriterRole = (*WriterRoleAdapter)(nil)

func (a *WriterRoleAdapter) ActionAppend(args []mbt.Arg) (any, error) {
	// Expect args[0].Value to be the int to append
	s, ok := args[0].Value.(int)
	if !ok {
		return nil, errors.New("invalid argument type for Append action")
	}
	a.bw.Append(s)
	return nil, nil
}

func (a *WriterRoleAdapter) ActionFlush(args []mbt.Arg) (any, error) {
	a.bw.Flush()
	return nil, nil
}

func (a *WriterRoleAdapter) GetState() (map[string]any, error) {
	buffer, flushed := a.bw.State()
	return map[string]any{
		"buffered": buffer,
		"flushed":  flushed,
	}, nil
}

// Model adaptor
type BufferedWriterModelAdapter struct {
	writerRole *WriterRoleAdapter
}

// Assert that BufferedWriterModelAdapter satisfies BufferedWriterModel
var _ BufferedWriterModel = (*BufferedWriterModelAdapter)(nil)

// Constructor for BufferedWriterModelAdapter
func NewBufferedWriterModel() BufferedWriterModel {
	return &BufferedWriterModelAdapter{}
}

func GetTestOptions() map[string]any {
	return map[string]any{
		"max-seq-runs":      1000,
		"max-parallel-runs": 1000,
		"max-actions":       20,
	}
}

func (m *BufferedWriterModelAdapter) GetState() (map[string]any, error) {
	// TODO: implement GetState. Required.
	return nil, mbt.ErrNotImplemented
}

func (m *BufferedWriterModelAdapter) GetRoles() (map[mbt.RoleId]mbt.Role, error) {
	roles := map[mbt.RoleId]mbt.Role{
		{RoleName: "Writer", Index: 0}: m.writerRole,
	}
	return roles, nil
}

func (m *BufferedWriterModelAdapter) Init() error {
	// Initialize the SUT for each test run
	m.writerRole = &WriterRoleAdapter{
		bw: writer.NewBufferedWriter(), // buffer size can be adjusted as needed
	}
	return nil
}

func (m *BufferedWriterModelAdapter) Cleanup() error {
	// TODO: implement Cleanup
	return nil
}
