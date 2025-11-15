use crate::fizztests::counter::traits::*;
use crate::fizztests::counter::adapters::{new_counter_model, get_test_options};
use fizzbee_mbt::traits::*;
use fizzbee_mbt::types::*;
use fizzbee_mbt::value::*;
use fizzbee_mbt::error::MbtError;
use async_trait::async_trait;

/// The Dispatcher routes actions from the MBT framework to the correct Role instance.
/// It wraps the concrete Model implementation.
pub struct CounterActionDispatcher<T>
where
    T: CounterModel + Send + Sync + 'static,
{
    // The concrete model instance is owned directly
    model: Option<T>, 
}

#[async_trait]
impl<T> Model for CounterActionDispatcher<T>
where
    T: Model + CounterModel + Send + Sync + 'static,
{
    /// Delegates initialization to the inner model instance.
    async fn init(&mut self) -> Result<(), MbtError> {
        self.model.as_mut().ok_or_else(|| MbtError::other("Model not found"))?
            .init().await // Must await the inner async call
    }

    /// Delegates cleanup to the inner model instance.
    async fn cleanup(&mut self) -> Result<(), MbtError> {
        self.model.as_mut().ok_or_else(|| MbtError::other("Model not found"))?
            .cleanup().await // Must await the inner async call
    }
}

impl<T> CounterActionDispatcher<T>
where
    T: CounterModel + Send + Sync + 'static,
{
    pub fn new(model: T) -> Self {
        CounterActionDispatcher { model: Some(model) }
    }
}

/// Implementation of the framework's core execution contract (`DispatchModel`).
#[async_trait]
impl<T> DispatchModel for CounterActionDispatcher<T>
where
    T: CounterModel,
    T: Send + Sync + 'static,
{
    async fn execute(
        &self,
        role_id: &RoleId,
        function_name: &str,
        _args: &[Arg], // Argument placeholder
    ) -> Result<Value, MbtError> {
        
        match role_id.role_name.as_str() {
            "Counter" => {
                let index = role_id.index as usize;

                let inner_model_ref = self.model.as_ref().ok_or_else(|| {
                    MbtError::other("Model is not initialized or has been moved out of the dispatcher.")
                })?;
                
                // Retrieve the concrete Role instances from the inner model
                let roles_vec = inner_model_ref.get_counter_roles()?;
                
                // Get the specific role instance based on the index
                let role_rc = roles_vec.get(index)
                    .ok_or(MbtError::other("CounterRole instance not found"))?;

                match function_name {
                    // Must await the async action calls
                    "Get" => role_rc.action_get(&[]).await,
                    "Inc" => role_rc.action_inc(&[]).await,
                    "Dec" => role_rc.action_dec(&[]).await,
                    _ => Err(MbtError::other(
                        format!("Unknown action '{}' for CounterRole", function_name)
                    )),
                }
            }
            _ => Err(MbtError::other(format!("Unknown role: {}", role_id.role_name))),
        }
    }
    
    fn get_roles(&self) -> Result<Vec<RoleId>, MbtError> {
        // Get an immutable reference to the inner model
        let inner_model_ref = self.model.as_ref().ok_or_else(|| {
            MbtError::other("Model is not initialized or has been moved out of the dispatcher.")
        })?;

        // Call the model's method to get the list of available role instances.
        let counter_roles = inner_model_ref.get_counter_roles()?;

        // Map the discovered role instances to the framework's RoleId structs.
        let counter_role_ids: Vec<RoleId> = counter_roles.iter()
            .enumerate()
            .map(|(index, _)| RoleId {
                role_name: "Counter".to_string(), 
                index: index as i32,
            })
            .collect();
        
        Ok(counter_role_ids)
    }
}

// Use a runtime test macro to allow async operations inside the test function
#[test] 
fn test_counter_model() -> Result<(), MbtError> { 
    let model = new_counter_model(); 
    
    let dispatcher = CounterActionDispatcher::new(model); 
    
    // Executes model-based test traces.
    fizzbee_mbt::run_mbt_test(dispatcher, get_test_options())?;
    
    Ok(())
}
