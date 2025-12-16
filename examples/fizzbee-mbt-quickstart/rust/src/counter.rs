use std::sync::atomic::{AtomicI32, Ordering};

// Implementation with a concurrency bug
#[derive(Debug)]
pub struct BadMemCounter {
    limit: i32,
    value: AtomicI32,
}

impl BadMemCounter {
    pub fn new(limit: i32) -> Self {
        Self { limit, value: AtomicI32::new(0) }
    }

    pub async fn inc(&self) {
        if self.value.load(Ordering::SeqCst) < self.limit {
            self.value.fetch_add(1, Ordering::SeqCst);
        }
        
    }

    pub async fn dec(&self) {
        if self.value.load(Ordering::SeqCst) > 0 {
            self.value.fetch_sub(1, Ordering::SeqCst);
        }
    }

    pub async fn get(&self) -> i32 {
        self.value.load(Ordering::SeqCst)
    }
}

// Implementation without a concurrency bug
#[derive(Debug)]
pub struct GoodMemCounter {
    limit: i32,
    value: AtomicI32,
}

impl GoodMemCounter {
    pub fn new(limit: i32) -> Self {
        Self { limit, value: AtomicI32::new(0) }
    }

    pub async fn inc(&self) {
        let _ = self.value.fetch_update(
            Ordering::SeqCst,
            Ordering::SeqCst,
            |current| {
                if current < self.limit {
                    Some(current + 1) // attempt to update to this value
                } else {
                    None              // stop trying — limit reached
                }
            },
        );
    }

    pub async fn dec(&self) {
        let _ = self.value.fetch_update(
            Ordering::SeqCst,
            Ordering::SeqCst,
            |current| {
                if current > 0 {
                    Some(current - 1) // attempt to update to this value
                } else {
                    None              // stop trying — already at zero
                }
            },
        );
    }

    pub async fn get(&self) -> i32 {
        self.value.load(Ordering::SeqCst)
    }
}
