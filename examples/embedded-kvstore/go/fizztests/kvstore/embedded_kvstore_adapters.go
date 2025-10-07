// Generated scaffold by fizzbee-mbt generator
// Source: examples/embedded-kvstore/fizz/embedded_kvstore.fizz
// Update the methods with your implementation.
package kvstore

import (
	"context"
	"embedded-kvstore/kvstore"
	"encoding/json"
	"errors"
	"io"
	"os"
	"strings"

	mbt "github.com/fizzbee-io/fizzbee/mbt/lib/go"
	"gocloud.dev/blob"
)

// Role adaptors

// WriterRoleAdapter is a stub adaptor for WriterRole
type WriterRoleAdapter struct {
	store *kvstore.KVStore
}

// Assert that WriterRoleAdapter satisfies WriterRole
var _ WriterRole = (*WriterRoleAdapter)(nil)

func (a *WriterRoleAdapter) ActionPut(args []mbt.Arg) (any, error) {
	val := args[1].Value.(string)
	if val == "NOT_FOUND" {
		err := a.store.Delete(context.Background(), []byte(args[0].Value.(string)))
		return nil, err
	} else {
		err := a.store.Put(context.Background(), []byte(args[0].Value.(string)), []byte(args[1].Value.(string)))
		return nil, err
	}

}

func (a *WriterRoleAdapter) ActionGet(args []mbt.Arg) (any, error) {
	val, err := a.store.Get(context.Background(), []byte(args[0].Value.(string)), getReadOptions(args[1]))
	if err != nil {
		if errors.Is(err, kvstore.KEY_NOT_FOUND) {
			return "NOT_FOUND", nil
		}
		return nil, err
	}
	return string(val), nil
}

func getReadOptions(arg mbt.Arg) *kvstore.ReadOptions {
	if !arg.Value.(bool) {
		return &kvstore.ReadOptions{Durability: kvstore.DurabilityRemote}
	}
	return &kvstore.ReadOptions{Durability: kvstore.DurabilityMemory}
}

func (a *WriterRoleAdapter) ActionFlush(args []mbt.Arg) (any, error) {
	err := a.store.Flush(context.Background())
	return nil, err
}

// StorageRoleAdapter is a stub adaptor for StorageRole
type StorageRoleAdapter struct {
	bucket *blob.Bucket
}

// GetState implements mbt.StateGetter.
func (s *StorageRoleAdapter) GetState() (map[string]any, error) {
	iter := s.bucket.List(nil)
	state := make(map[string]any)
	for {
		ctx := context.Background()
		obj, err := iter.Next(ctx)
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}
		data, err := s.bucket.ReadAll(ctx, obj.Key)
		if err != nil {
			return nil, err
		}
		var jsonData map[string][]byte
		if err := json.Unmarshal(data, &jsonData); err != nil {
			return nil, err
		}
		specState := make(map[string]string)
		for k, v := range jsonData {
			if v[0] == 0 {
				specState[k] = "NOT_FOUND"
			} else {
				specState[k] = string(v[1:])
			}
		}
		objKey := strings.Replace(obj.Key, ".json", ".sst", -1)
		state[objKey] = specState
	}
	return map[string]any{"data": state}, nil
}

// Assert that StorageRoleAdapter satisfies StorageRole
var _ StorageRole = (*StorageRoleAdapter)(nil)

// Assert that StorageRoleAdapter satisfies StorageRole
var _ mbt.StateGetter = (*StorageRoleAdapter)(nil)

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

func (m *EmbeddedKvstoreModelAdapter) Init() error {
	// TODO: implement Init
	// store, err := kvstore.NewKVStore(context.Background(), "mem://mybucket")

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

func (m *EmbeddedKvstoreModelAdapter) Cleanup() error {
	// TODO: implement Cleanup
	if m.writer != nil {
		m.writer.store.Close()
	}
	m.writer = nil
	m.storage = nil

	return nil
}
