use async_trait::async_trait;
use std::collections::HashMap;
use std::io;
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use object_store::{ObjectStore, path::Path};
use object_store::ObjectMeta;
use futures_util::TryStreamExt;
use mr_ulid::Ulid;

pub type Key = String;
pub type Value = Option<Vec<u8>>;
pub type RawValue = Vec<u8>;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum DurabilityLevel {
    Remote,
    Memory,
}

#[async_trait]
pub trait KvStore {
    async fn put(&self, key: Key, value: RawValue) -> Result<(), io::Error>;
    async fn get(&self, key: &Key, level: DurabilityLevel) -> Result<Value, io::Error>;
    async fn delete(&self, key: &Key) -> Result<(), io::Error>;
    async fn flush(&self) -> Result<(), io::Error>;
}

pub struct EmbeddedKvStore {
    // Active in-memory buffer
    buf: RwLock<HashMap<Key, Value>>,

    // Frozen buffer ready to be written to object store
    immutable_buf: Mutex<HashMap<Key, Value>>,

    // Ensures only one concurrent flush
    flush_gate: Mutex<()>,

    store: Arc<dyn ObjectStore>,
}

impl EmbeddedKvStore {
    pub fn new(store: Arc<dyn ObjectStore>) -> Self {
        Self {
            buf: RwLock::new(HashMap::new()),
            immutable_buf: Mutex::new(HashMap::new()),
            flush_gate: Mutex::new(()),
            store,
        }
    }

    fn segment_path(&self) -> Path {
        let id = Ulid::new().to_string();
        Path::from(format!("data/{id}.json"))
    }

    /// Fast operation: swap active buffer into immutable buffer for background write.
    async fn freeze_internal(&self) -> Result<bool, io::Error> {
        let mut buf = self.buf.write().await;
        let mut immutable_buf = self.immutable_buf.lock().await;

        let did_freeze = !buf.is_empty() && immutable_buf.is_empty();
        
        if did_freeze {
            *immutable_buf = std::mem::take(&mut *buf);
        }

        Ok(did_freeze)
    }

    /// Slow I/O: serialize the immutable buffer and write it to the object store.
    async fn write_internal(&self) -> Result<(), io::Error> {
        let (filename, content) = {
            let mut immutable_buf = self.immutable_buf.lock().await;
            if immutable_buf.is_empty() {
                return Ok(());
            }

            let filename = self.segment_path();
            let content = std::mem::take(&mut *immutable_buf);
            // let content = immutable_buf.clone();
            (filename, content)
        };

        let serialized_bytes = serde_json::to_vec(&content)
            .map_err(|e| io::Error::other(format!("Serialization error: {e}")))?;

        self.store
            .put(&filename, serialized_bytes.into())
            .await
            .map_err(|e| io::Error::other(format!("ObjectStore put error: {e}")))?;

        Ok(())
    }

    async fn read_segment(&self, path: &Path) -> Result<HashMap<Key, Value>, io::Error> {
        match self.store.get(path).await {
            Ok(get_result) => {
                let bytes = get_result
                    .bytes()
                    .await
                    .map_err(|e| io::Error::other(format!("Failed to get bytes: {e}")))?;

                let map: HashMap<Key, Value> = serde_json::from_slice(&bytes)
                    .map_err(|e| io::Error::new(
                        io::ErrorKind::InvalidData,
                        format!("Deserialization error: {e}")
                    ))?;

                Ok(map)
            }
            Err(object_store::Error::NotFound { .. }) => Ok(HashMap::new()),
            Err(e) => Err(io::Error::other(format!("ObjectStore get error: {e}"))),
        }
    }
}

#[async_trait]
impl KvStore for EmbeddedKvStore {
    async fn put(&self, key: Key, value: RawValue) -> Result<(), io::Error> {
        let mut buf = self.buf.write().await;
        buf.insert(key, Some(value));
        Ok(())
    }

    async fn delete(&self, key: &Key) -> Result<(), io::Error> {
        let mut buf = self.buf.write().await;
        buf.insert(key.clone(), None);
        Ok(())
    }

    async fn get(&self, key: &Key, level: DurabilityLevel) -> Result<Value, io::Error> {
        let dirty_read = level == DurabilityLevel::Memory;

        if dirty_read {
            let buf = self.buf.read().await;
            if let Some(value) = buf.get(key) {
                return Ok(value.clone());
            }
            drop(buf); // Release read lock before acquiring immutable_buf lock
            
            let immutable_buf = self.immutable_buf.lock().await;
            if let Some(value) = immutable_buf.get(key) {
                return Ok(value.clone());
            }
        }

        let prefix = Path::from("data/");
        let list_stream = self.store.list(Some(&prefix));
        let objects: Vec<ObjectMeta> = list_stream.try_collect().await
            .map_err(|e| io::Error::other(format!("Failed to list objects: {e}")))?;

        for path in objects.into_iter().rev().map(|meta| meta.location) {
            let data = self.read_segment(&path).await?;
            if let Some(value) = data.get(key) {
                return Ok(value.clone());
            }
        }

        Ok(None)
    }

    async fn flush(&self) -> Result<(), io::Error> {
        let _guard = self.flush_gate.lock().await;

        self.freeze_internal().await?;
        self.write_internal().await?;
        self.immutable_buf.lock().await.clear();
        Ok(())
    }
}