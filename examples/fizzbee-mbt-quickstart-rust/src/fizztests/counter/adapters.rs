// Generated scaffold by fizzbee-mbt generator
// Source: ../../../Users/jp/src/fizzbee-mbt-examples/examples/fizzbee-mbt-quickstart/specs/simple-counter/counter.fizz
// Update the methods with your implementation.

use fizzbee_mbt::config::TestOptions;
use fizzbee_mbt::error::MbtError;
use fizzbee_mbt::traits::*;
use fizzbee_mbt::types::Arg;
use fizzbee_mbt::value::Value;
use std::sync::Arc;
use async_trait::async_trait;

use crate::counter::BadMemCounter as MemCounter; // Your system under test (SUT)

use super::traits::*;

// Role adapters

// CounterRoleAdapter is a stub adaptor for CounterRole
pub struct CounterRoleAdapter {
    counter: MemCounter,
}

#[async_trait]
impl CounterRole for CounterRoleAdapter {
    async fn action_inc(&self, _args: &[Arg]) -> Result<Value, MbtError> {
        self.counter.inc().await;
        Ok(Value::None)
    }
    async fn action_get(&self, _args: &[Arg]) -> Result<Value, MbtError> {
        let result = self.counter.get().await;
        Ok(Value::Int(result.into()))
    }
    async fn action_dec(&self, _args: &[Arg]) -> Result<Value, MbtError> {
        self.counter.dec().await;
        Ok(Value::None)
    }
}

impl Role for CounterRoleAdapter {}

// Constructor for role adapter
impl CounterRoleAdapter {
    pub fn new() -> Self {
        CounterRoleAdapter { counter: MemCounter::new(3) }
    }
}


// Model adapter
pub struct CounterModelAdapter {
    // TODO: Add fields for your model state and roles
    counter_roles: Vec<Arc<CounterRoleAdapter>>,
    
}

// Assert that CounterModelAdapter satisfies CounterModel
impl CounterModel for CounterModelAdapter {
    type R0 = CounterRoleAdapter;
    fn get_counter_roles(&self) -> Result<Vec<Arc<Self::R0>>, MbtError> {
        // TODO: implement get_counter_roles
        Ok(self.counter_roles.clone().into_iter().map(|r| r as Arc<Self::R0>).collect())
    }
    

    
    
}

#[async_trait]
impl Model for CounterModelAdapter {
    // TODO: Implement async GetState, Init, and Cleanup methods
    async fn init(&mut self) -> Result<(), MbtError> {
        // TODO: implement Init
        self.counter_roles.push(Arc::new(CounterRoleAdapter::new()));
        
        Ok(())
    }

    async fn cleanup(&mut self) -> Result<(), MbtError> {
        self.counter_roles = Vec::new();
        Ok(())
    }
}

// Constructor for CounterModelAdapter
pub fn new_counter_model() -> CounterModelAdapter {
    CounterModelAdapter {
        counter_roles: Vec::new(),
        
    }
}

/// Defines the parameters for the model-based testing harness.
pub fn get_test_options() -> TestOptions {
    TestOptions {
        // The number of sequential traces to test
        max_seq_runs: Some(1000),

        // The number of parallel traces to test
        max_parallel_runs: Some(1000),

        // The maximum number of actions/steps in any single trace
        max_actions: Some(10),
    }
}