// Generated scaffold by fizzbee-mbt generator
// Source: ../../../fizz/embedded_kvstore.fizz
// Update the methods with your implementation.

use fizzbee_mbt::config::TestOptions;
use fizzbee_mbt::error::MbtError;
use fizzbee_mbt::traits::*;
use fizzbee_mbt::types::Arg;
use fizzbee_mbt::value::Value;
use std::sync::Arc;
use async_trait::async_trait;
use super::traits::*;

use crate::kvstore::EmbeddedKvStore; // Your system under test (SUT)
use crate::kvstore::DurabilityLevel;
use crate::kvstore::KvStore;

use object_store::memory::InMemory;

// Role adapters

// WriterRoleAdapter bridges the FizzBee model to your actual implementation
pub struct WriterRoleAdapter {
    kvstore: EmbeddedKvStore,  // IMPLEMENTATION TIP: Store your system under test here
}

#[async_trait]
impl WriterRole for WriterRoleAdapter {
    async fn action_put(&self, args: &[Arg]) -> Result<Value, MbtError> {
        // STEP 1: Validate argument count
        if args.len() != 2 {
            return Err(MbtError::Other("Expected 2 arguments for put".to_string()));
        }
        
        // STEP 2: Extract arguments with type checking
        // Pattern match on args[i].value to extract typed values
        let key = match &args[0].value {
            Value::Str(s) => s.clone(),
            _ => return Err(MbtError::Other("Expected string for key".to_string())),
        };
        let value_str = match &args[1].value {
            Value::Str(s) => s.clone(),
            _ => return Err(MbtError::Other("Expected string for value".to_string())),
        };

        // SEMANTIC MAPPING: Model uses special value for delete, impl has separate method
        // Your model may simplify operations differently than your implementation
        if value_str == "NOT_FOUND" {
            self.kvstore.delete(&key).await
                .map_err(|e| MbtError::Other(format!("KvStore delete failed: {}", e)))?;
        } else {
            // STEP 3: Convert to your implementation's types
            let value: Vec<u8> = value_str.into_bytes();
            
            // STEP 4: Call your actual implementation
            self.kvstore.put(key, value).await
                .map_err(|e| MbtError::Other(format!("KvStore put failed: {}", e)))?;
        }
        
        // STEP 5: Return result as fizzbee::Value
        Ok(Value::None)
    }

    async fn action_get(&self, args: &[Arg]) -> Result<Value, MbtError> {
        if args.len() != 2 {
            return Err(MbtError::Other("Expected 2 arguments for get".to_string()));
        }
        
        // Extract arguments
        let key = match &args[0].value {
            Value::Str(s) => s.clone(),
            _ => return Err(MbtError::Other("Expected string for key".to_string())),
        };
        
        let is_dirty_read = match &args[1].value {
            Value::Bool(b) => *b,
            _ => return Err(MbtError::Other("Expected boolean for durability".to_string())),
        };

        // PARAMETER MAPPING: Map model parameters to implementation choices
        // Model has boolean dirty_read, impl uses DurabilityLevel enum
        let level = if is_dirty_read {
            DurabilityLevel::Memory
        } else {
            DurabilityLevel::Remote
        };

        // Call implementation
        let result = self.kvstore.get(&key, level).await
            .map_err(|e| MbtError::Other(format!("KvStore get failed: {}", e)))?;

        // RETURN VALUE MAPPING: Convert implementation result to fizzbee::Value
        match result {
            Some(v) => {
                let s = String::from_utf8(v)
                    .map_err(|_| MbtError::Other("Failed to convert Vec<u8> to String".to_string()))?;
                Ok(Value::Str(s))
            },
            // Map None to sentinel value that model understands
            None => Ok(Value::Str("NOT_FOUND".to_string())),
        }
    }

    async fn action_flush(&self, _args: &[Arg]) -> Result<Value, MbtError> {        
        // Simple case: no arguments, just call implementation
        self.kvstore.flush().await
            .map_err(|e| MbtError::Other(format!("KvStore flush failed: {}", e)))?;  
        Ok(Value::None)
    }
}

impl Role for WriterRoleAdapter {}

// Constructor for role adapter
impl WriterRoleAdapter {
    pub fn new() -> Self {
        // INITIALIZATION: Create and configure your system under test
        // Set up any dependencies your implementation needs
        let in_memory_store = Arc::new(InMemory::new());
        WriterRoleAdapter { kvstore: EmbeddedKvStore::new(in_memory_store) }
    }
}

// StorageRoleAdapter - some roles may have no actions (model-only state)
pub struct StorageRoleAdapter {}

#[async_trait]
impl StorageRole for StorageRoleAdapter {
    // No actions to implement - Storage role is internal to the model
}

impl Role for StorageRoleAdapter {}

impl StorageRoleAdapter {
    pub fn new() -> Self {
        StorageRoleAdapter {}
    }
}


// Model adapter - wires all roles together
pub struct EmbeddedKvstoreModelAdapter {
    writer_roles: Vec<Arc<WriterRoleAdapter>>,
    storage_roles: Vec<Arc<StorageRoleAdapter>>,
}

impl EmbeddedKvstoreModel for EmbeddedKvstoreModelAdapter {
    type R0 = WriterRoleAdapter;
    fn get_writer_roles(&self) -> Result<Vec<Arc<Self::R0>>, MbtError> {
        Ok(self.writer_roles.clone().into_iter().map(|r| r as Arc<Self::R0>).collect())
    }
    type R1 = StorageRoleAdapter;
    fn get_storage_roles(&self) -> Result<Vec<Arc<Self::R1>>, MbtError> {
        Ok(self.storage_roles.clone().into_iter().map(|r| r as Arc<Self::R1>).collect())
    }
}

#[async_trait]
impl Model for EmbeddedKvstoreModelAdapter {
    async fn init(&mut self) -> Result<(), MbtError> {
        // INITIALIZATION: Create fresh instances for each test run
        self.writer_roles.push(Arc::new(WriterRoleAdapter::new()));
        self.storage_roles.push(Arc::new(StorageRoleAdapter::new()));
        
        Ok(())
    }

    async fn cleanup(&mut self) -> Result<(), MbtError> {
        // CLEANUP: Reset state between test runs
        // Ensure each test starts with clean state
        self.writer_roles = Vec::new();
        self.storage_roles = Vec::new();
        
        Ok(())
    }
}

// Constructor for EmbeddedKvstoreModelAdapter
pub fn new_embedded_kvstore_model() -> EmbeddedKvstoreModelAdapter {
    EmbeddedKvstoreModelAdapter {
        writer_roles: Vec::new(),
        storage_roles: Vec::new(),
    }
}

/// Defines the parameters for the model-based testing harness.
pub fn get_test_options() -> TestOptions {
    TestOptions {
        // Adjust these values based on your testing needs
        max_seq_runs: Some(1000),      // Number of sequential test traces
        max_parallel_runs: Some(1000),  // Number of parallel test traces
        max_actions: Some(10),          // Max steps per trace
    }
}
