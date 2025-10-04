package kvstore

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"

	"github.com/huandu/skiplist"
	"gocloud.dev/blob"
	_ "gocloud.dev/blob/fileblob"
	_ "gocloud.dev/blob/memblob" // for mem://
)

// DurabilityLevel specifies where to read data from.
type DurabilityLevel int

const (
	DurabilityRemote DurabilityLevel = iota // Only flushed blobs
	DurabilityMemory                        // In-memory (buffer, immutableBuf) and flushed blobs
)

var KEY_NOT_FOUND = errors.New("key not found")

type ReadOptions struct {
	Durability DurabilityLevel
}

// KVStore is a simple key-value store using an embedded blob store and a skiplist for buffering.
type KVStore struct {
	mu      sync.Mutex
	bucket  *blob.Bucket
	buffer  *skiplist.SkipList // key: []byte, value: []byte
	flushID int

	// NOTE: This implementation deviates from the Fizzbee spec.
	// There is a concurrency bug: dirty reads during flush may miss frozen data.
	// To fix, uncomment the following line and update logic as shown below.
	immutableBuf *skiplist.SkipList // holds frozen buffer during flush

	flushMutex sync.Mutex
}

func NewKVStore(ctx context.Context, bucketURL string) (*KVStore, error) {
	bucket, err := OpenBucket(ctx, bucketURL)
	if err != nil {
		return nil, err
	}
	return NewKVStoreFromBucket(bucket)
}

func NewKVStoreFromBucket(bucket *blob.Bucket) (*KVStore, error) {
	buf := skiplist.New(skiplist.Bytes)
	return &KVStore{
		bucket: bucket,
		buffer: buf,
	}, nil
}

func OpenBucket(ctx context.Context, bucketURL string) (*blob.Bucket, error) {
	bucket, err := blob.OpenBucket(ctx, bucketURL)
	if err != nil {
		return nil, err
	}
	return bucket, nil
}

func (kv *KVStore) Put(ctx context.Context, key, value []byte) error {
	kv.mu.Lock()
	defer kv.mu.Unlock()
	// Use skiplist for buffer
	kv.buffer.Set(key, value)
	return nil
}

func (kv *KVStore) Get(ctx context.Context, key []byte, opts *ReadOptions) ([]byte, error) {
	kv.mu.Lock()
	defer kv.mu.Unlock()
	durability := DurabilityRemote
	if opts != nil {
		durability = opts.Durability
	}

	if durability == DurabilityMemory {
		// Check buffer
		if elem := kv.buffer.Get(key); elem != nil {
			if elem.Value == nil {
				return nil, KEY_NOT_FOUND
			}
			if val, ok := elem.Value.([]byte); ok {
				return val, nil
			}
		}
		// To fix the concurrency bug, also check immutableBuf:
		if kv.immutableBuf != nil {
			if elem := kv.immutableBuf.Get(key); elem != nil {
				if elem.Value == nil {
					return nil, KEY_NOT_FOUND
				}
				if val, ok := elem.Value.([]byte); ok {
					if val[0] == 0 {
						return nil, KEY_NOT_FOUND
					}
					return val[1:], nil
				}
			}
		}

		// This is a bug: if the key is not found in memory, we should check the flushed blobs.
		// return nil, KEY_NOT_FOUND
	}

	// Check flushed blobs
	for i := kv.flushID; i > 0; i-- {
		blobKey := fmt.Sprintf("data/%04d.json", i)
		data, err := kv.readBlob(ctx, blobKey)
		if err != nil {
			continue // skip missing blobs
		}
		var kvPairs map[string][]byte
		if err := json.Unmarshal(data, &kvPairs); err != nil {
			return nil, err
		}
		k := string(key)
		if val, ok := kvPairs[k]; ok {
			if val[0] == 0 {
				return nil, KEY_NOT_FOUND
			}
			return val[1:], nil
		}
	}
	return nil, KEY_NOT_FOUND
}

func (kv *KVStore) Delete(ctx context.Context, key []byte) error {
	kv.mu.Lock()
	defer kv.mu.Unlock()

	kv.buffer.Set(key, nil)
	// Note: deletes only affect buffer, not flushed blobs
	return nil
}

func (kv *KVStore) Flush(ctx context.Context) error {
	kv.flushMutex.Lock()
	defer kv.flushMutex.Unlock()
	kv.mu.Lock()
	if kv.buffer.Len() == 0 {
		kv.mu.Unlock()
		return nil
	}
	// Snapshot buffer and clear
	bufMap := make(map[string][]byte)
	for iter := kv.buffer.Front(); iter != nil; iter = iter.Next() {
		k := iter.Key().([]byte)
		var v []byte = []byte{0}
		if iter.Value != nil {
			v[0] = 1
			v = append(v, iter.Value.([]byte)...)
		}
		bufMap[string(k)] = v
	}
	kv.buffer = skiplist.New(skiplist.Bytes) // clear buffer
	kv.flushID++
	flushID := kv.flushID
	// To fix the concurrency bug, uncomment the following line:
	kv.immutableBuf = skiplist.New(skiplist.Bytes)
	for k, v := range bufMap {
		kv.immutableBuf.Set([]byte(k), v)
	}
	kv.mu.Unlock()

	// Write snapshot outside lock
	data, err := json.Marshal(bufMap)
	if err != nil {
		return err
	}
	blobKey := fmt.Sprintf("data/%04d.json", flushID)
	err = kv.writeBlob(ctx, blobKey, data)
	if err != nil {
		return err
	}
	// To fix the bug, clear immutableBuf after flush:
	kv.mu.Lock()
	kv.immutableBuf = nil
	kv.mu.Unlock()
	return nil
}

func (kv *KVStore) writeBlob(ctx context.Context, blobKey string, data []byte) error {
	return kv.bucket.WriteAll(ctx, blobKey, data, nil)
}

func (kv *KVStore) readBlob(ctx context.Context, blobKey string) ([]byte, error) {
	return kv.bucket.ReadAll(ctx, blobKey)
}

func (kv *KVStore) Close() error {
	return kv.bucket.Close()
}

func (kv *KVStore) Bucket() *blob.Bucket {
	return kv.bucket
}

func SomeSampleFunc() {
	fmt.Println("Sample function in kvstore package")
	fmt.Println("This is to check coverage when running multiple tests.")
}
