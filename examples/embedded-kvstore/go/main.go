package main

import (
	"context"
	"fmt"
)

func main() {
	// Creates a new in-memory key-value store
	ctx := context.Background()
	store, err := NewKVStore(ctx, "mem://mybucket")
	if err != nil {
		fmt.Println("Error creating store:", err)
		return
	}

	// Put some key-value pairs
	store.Put(ctx, []byte("foo"), []byte("bar"))
	store.Put(ctx, []byte("baz"), []byte("qux"))

	// Dirty read (should see unflushed data)
	val, err := store.Get(ctx, []byte("foo"), &ReadOptions{Durability: DurabilityMemory})
	if err != nil {
		fmt.Println("Dirty read error:", err)
	} else {
		fmt.Printf("Dirty read for 'foo': %s\n", val)
	}

	// Clean read (should not see unflushed data)
	val, err = store.Get(ctx, []byte("foo"), &ReadOptions{Durability: DurabilityRemote})
	if err != nil {
		fmt.Println("Clean read error:", err)
	} else {
		fmt.Printf("Clean read for 'foo': %s\n", val)
	}

	// Dirty read (should see unflushed data)
	val, err = store.Get(ctx, []byte("baz"), &ReadOptions{Durability: DurabilityMemory})
	if err != nil {
		fmt.Println("Dirty read error:", err)
	} else {
		fmt.Printf("Dirty read for 'baz': %s\n", val)
	}

	// Flush the buffer
	if err := store.Flush(ctx); err != nil {
		fmt.Println("Flush error:", err)
	} else {
		fmt.Println("Flushed buffer")
	}

	// Clean read after flush (should see data)
	val, err = store.Get(ctx, []byte("foo"), &ReadOptions{Durability: DurabilityRemote})
	if err != nil {
		fmt.Println("Clean read after flush error:", err)
	} else {
		fmt.Printf("Clean read after flush for 'foo': %s\n", val)
	}

	// Dirty read after flush (should see data)
	val, err = store.Get(ctx, []byte("foo"), &ReadOptions{Durability: DurabilityMemory})
	if err != nil {
		fmt.Println("Dirty read after flush error:", err)
	} else {
		fmt.Printf("Dirty read after flush for 'foo': %s\n", val)
	}

	// Delete a key
	err = store.Delete(ctx, []byte("baz"))
	if err != nil {
		fmt.Println("Delete error:", err)
	} else {
		fmt.Println("Deleted key 'baz'")
	}

	// Try to get deleted key (dirty read)
	val, err = store.Get(ctx, []byte("baz"), &ReadOptions{Durability: DurabilityMemory})
	if err != nil {
		fmt.Println("Dirty read after delete error:", err)
	} else {
		fmt.Printf("Dirty read after delete for 'baz': %s\n", val)
	}

	// Try to get deleted key (clean read)
	val, err = store.Get(ctx, []byte("baz"), &ReadOptions{Durability: DurabilityRemote})
	if err != nil {
		fmt.Println("Clean read after delete error:", err)
	} else {
		fmt.Printf("Clean read after delete for 'baz': %s\n", val)
	}
}
