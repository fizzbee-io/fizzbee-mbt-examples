// Generated scaffold by fizzbee-mbt generator
// Source: ../../fizz/embedded_kvstore.fizz
// Update the methods with your implementation.
package kvstore_test

import (
	"context"
	"embedded-kvstore/kvstore"
	"errors"
	"os"

	mbt "github.com/fizzbee-io/fizzbee/mbt/lib/go"
	"gocloud.dev/blob"
)

var ErrInvalidArg = errors.New("invalid argument")

// Role adaptors

// WriterRoleAdapter is a stub adaptor for WriterRole
type WriterRoleAdapter struct {
	store *kvstore.KVStore
}

// Assert that WriterRoleAdapter satisfies WriterRole
var _ WriterRole = (*WriterRoleAdapter)(nil)

func (a *WriterRoleAdapter) ActionPut(args []mbt.Arg) (any, error) {
	// args[0].Value: key (string)
	// args[1].Value: value (string)
	key, ok := args[0].Value.(string)
	if !ok {
		return nil, ErrInvalidArg
	}
	val, ok := args[1].Value.(string)
	if !ok {
		return nil, ErrInvalidArg
	}
	if val == "NOT_FOUND" {
		return nil, a.store.Delete(context.Background(), []byte(key))
	}
	return nil, a.store.Put(context.Background(), []byte(key), []byte(val))
}

func (a *WriterRoleAdapter) ActionGet(args []mbt.Arg) (any, error) {
	key, ok := args[0].Value.(string)
	if !ok {
		return nil, ErrInvalidArg
	}
	dirtyRead, ok := args[1].Value.(bool)
	if !ok {
		return nil, ErrInvalidArg
	}
	readOptions := &kvstore.ReadOptions{}
	if dirtyRead {
		readOptions.Durability = kvstore.DurabilityMemory
	} else {
		readOptions.Durability = kvstore.DurabilityRemote
	}
	val, err := a.store.Get(context.Background(), []byte(key), readOptions)
	if err != nil {
		// If the key is not found, return "NOT_FOUND"
		return "NOT_FOUND", nil
	}
	return string(val), nil
}

func (a *WriterRoleAdapter) ActionFlush(args []mbt.Arg) (any, error) {
	// Flush should persist all in-memory data to disk.
	return nil, a.store.Flush(context.Background())
}

// StorageRoleAdapter is a stub adaptor for StorageRole
type StorageRoleAdapter struct {
	bucket *blob.Bucket
}

// Assert that StorageRoleAdapter satisfies StorageRole
var _ StorageRole = (*StorageRoleAdapter)(nil)

// Model adaptor
type EmbeddedKvstoreModelAdapter struct {
	writer  *WriterRoleAdapter
	storage *StorageRoleAdapter
}

// Assert that EmbeddedKvstoreModelAdapter satisfies EmbeddedKvstoreModel
var _ EmbeddedKvstoreModel = (*EmbeddedKvstoreModelAdapter)(nil)

// Constructor for EmbeddedKvstoreModelAdapter
func NewEmbeddedKvstoreModel() EmbeddedKvstoreModel {
	return &EmbeddedKvstoreModelAdapter{}
}

func GetTestOptions() map[string]any {
	return map[string]any{
		"max-seq-runs":      1000,
		"max-parallel-runs": 1000,
		"max-actions":       20,
	}
}

func (m *EmbeddedKvstoreModelAdapter) GetState() (map[string]any, error) {
	// TODO: implement GetState. Required.
	return nil, mbt.ErrNotImplemented
}

func (m *EmbeddedKvstoreModelAdapter) Init() error {
	// Create a temporary directory for the bucket
	bucketDir, err := os.MkdirTemp("/tmp/", "mybucket-")
	if err != nil {
		return err
	}
	store, err := kvstore.NewKVStore(context.Background(), "file://"+bucketDir)
	if err != nil {
		return err
	}
	m.writer = &WriterRoleAdapter{store: store}
	m.storage = &StorageRoleAdapter{bucket: store.Bucket()}
	return nil
}

func (m *EmbeddedKvstoreModelAdapter) GetRoles() (map[mbt.RoleId]mbt.Role, error) {
	roles := make(map[mbt.RoleId]mbt.Role)
	if m.writer != nil {
		roles[mbt.RoleId{RoleName: "Writer", Index: 0}] = m.writer
	}
	if m.storage != nil {
		roles[mbt.RoleId{RoleName: "Storage", Index: 0}] = m.storage
	}
	return roles, nil
}

func (m *EmbeddedKvstoreModelAdapter) Cleanup() error {
	// TODO: implement Cleanup
	return nil
}
