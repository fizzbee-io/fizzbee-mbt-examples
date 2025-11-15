// User-provided implementation: Adapters for the MemCounter system under test.
//
// All trait methods defined in the 'traits.rs' file are asynchronous and must be 
// marked with the #[async_trait] macro and use .await when calling async code.

use super::traits::*;
use fizzbee_mbt::config::TestOptions;
use fizzbee_mbt::traits::*;
use fizzbee_mbt::types::*;
use fizzbee_mbt::value::Value;
use fizzbee_mbt::error::MbtError;
use crate::counter::BadMemCounter; // Your system under test (SUT)
use std::sync::Arc;
use async_trait::async_trait;


// --- 1. Role Adapter: Implementation of Actions (Inc, Dec, Get) ---

/// Concrete implementation of the 'CounterRole'.
/// This adapter directly holds a reference to the system under test (MemCounter).
pub struct CounterRoleAdapter {
    counter: BadMemCounter,
}

impl CounterRoleAdapter {
    fn new(counter: BadMemCounter) -> Self {
        Self { counter }
    }
}

// REQUIRED: All Role implementations must implement the base `Role` trait.
impl Role for CounterRoleAdapter {}

/// REQUIRED: Implement the generated `CounterRole` trait.
#[async_trait]
impl CounterRole for CounterRoleAdapter {
    /// Implements the 'Inc' action by calling the async method on the MemCounter.
    async fn action_inc(&self, _args: &[Arg]) -> Result<Value, MbtError> {
        // NOTE: The inner method is async, so we MUST call .await
        self.counter.inc().await; 
        Ok(Value::None)
    }

    /// Implements the 'Dec' action.
    async fn action_dec(&self, _args: &[Arg]) -> Result<Value, MbtError> {
        // NOTE: The inner method is async, so we MUST call .await
        self.counter.dec().await;
        Ok(Value::None)
    }

    /// Implements the 'Get' action, returning the current value.
    async fn action_get(&self, _args: &[Arg]) -> Result<Value, MbtError> {
        // NOTE: Await the async result (i32) before converting it to Value::Int (i64).
        Ok(Value::Int(self.counter.get().await.into()))
    }
}


// --- 2. Model Adapter: Lifecycle and Role Management ---

/// Concrete implementation of the 'CounterModel'.
/// This struct holds all 'CounterRoleAdapter' instances (one in this case).
pub struct CounterModelAdapter {
    // Arc is required because the Role instances must be Send + Sync + 'static.
    // This field will be overwritten in the `init` method.
    counter_role: Arc<CounterRoleAdapter>, 
}

/// REQUIRED: Implement the base `Model` trait for lifecycle management.
#[async_trait]
impl Model for CounterModelAdapter {
    /// Called before every trace run. Use this to initialize the system state.
    async fn init(&mut self) -> Result<(), MbtError> {
        // Initialize the SUT with the desired limit (e.g., 3).
        // This creation ensures a fresh, clean state before each test trace.
        self.counter_role = Arc::new(CounterRoleAdapter::new(BadMemCounter::new(3)));
        Ok(())
    }

    /// Called after every trace run. Use this for cleanup if necessary.
    async fn cleanup(&mut self) -> Result<(), MbtError> {
        // For this counter, cleanup is a no-op, but for complex systems, 
        // this is where you'd reset databases or clear shared memory.
        Ok(())
    }
}

/// REQUIRED: Implement the generated `CounterModel` trait for role discovery.
impl CounterModel for CounterModelAdapter {
    // Specify the concrete Role type used in this model.
    type R = CounterRoleAdapter; 

    /// Returns a vector of all 'CounterRoleAdapter' instances managed by this model.
    fn get_counter_roles(&self) -> Result<Vec<Arc<Self::R>>, MbtError> {
        let mut roles = Vec::new();
        // Since we only have one counter, we clone the Arc and return it.
        // This is safe because `init` is always called first.
        roles.push(Arc::clone(&self.counter_role)); 
        Ok(roles)
    }
}


// --- 3. Model Factory and Test Configuration ---

// Implement the Default trait for a clean placeholder initialization
impl Default for CounterRoleAdapter {
    fn default() -> Self {
        // Create a temporary/placeholder counter for the initial state
        CounterRoleAdapter::new(BadMemCounter::new(0))
    }
}

/// Factory function required by the test harness to get a new instance of your model adapter.
pub fn new_counter_model() -> impl CounterModel<R = CounterRoleAdapter> {
    // This initial state is immediately overwritten by `Model::init()` before
    // any actions are executed, but is required for Rust's initialization safety.
    CounterModelAdapter {
        counter_role: Arc::new(CounterRoleAdapter::default()),
    }
}

/// Defines the parameters for the model-based testing harness.
pub fn get_test_options() -> TestOptions {
    TestOptions {
        // The number of sequential traces to test (good for validation/debugging)
        max_seq_runs: Some(1000),

        // The number of parallel traces to test (critical for finding concurrency bugs)
        max_parallel_runs: Some(10000),

        // The maximum number of actions/steps in any single trace
        max_actions: Some(10),
    }
}