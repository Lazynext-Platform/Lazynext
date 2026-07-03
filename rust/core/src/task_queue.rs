//! Background Task Queue — priority-based async task processing.
//!
//! Manages a persistent queue of background tasks: auto-exports, backups,
//! media cleanup, proxy generation, and thumbnail regeneration. A
//! background worker processes tasks continuously by priority order.

use serde::{Deserialize, Serialize};
use std::collections::BinaryHeap;
use std::cmp::Ordering;

// ── Types ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TaskStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "running")]
    Running,
    #[serde(rename = "completed")]
    Completed,
    #[serde(rename = "failed")]
    Failed,
    #[serde(rename = "cancelled")]
    Cancelled,
}

impl std::fmt::Display for TaskStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TaskStatus::Pending => write!(f, "pending"),
            TaskStatus::Running => write!(f, "running"),
            TaskStatus::Completed => write!(f, "completed"),
            TaskStatus::Failed => write!(f, "failed"),
            TaskStatus::Cancelled => write!(f, "cancelled"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TaskType {
    #[serde(rename = "auto_export")]
    AutoExport,
    #[serde(rename = "auto_backup")]
    AutoBackup,
    #[serde(rename = "media_cleanup")]
    MediaCleanup,
    #[serde(rename = "proxy_generation")]
    ProxyGeneration,
    #[serde(rename = "thumbnail_regeneration")]
    ThumbnailRegeneration,
}

impl std::fmt::Display for TaskType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TaskType::AutoExport => write!(f, "auto_export"),
            TaskType::AutoBackup => write!(f, "auto_backup"),
            TaskType::MediaCleanup => write!(f, "media_cleanup"),
            TaskType::ProxyGeneration => write!(f, "proxy_generation"),
            TaskType::ThumbnailRegeneration => write!(f, "thumbnail_regeneration"),
        }
    }
}

/// A single background task with priority and type.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub name: String,
    pub payload: String,
    pub priority: u8, // 0 = highest, 255 = lowest
    pub status: TaskStatus,
    pub created_at: String,
    pub task_type: TaskType,
}

/// Result of processing a single task.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskResult {
    pub task_id: String,
    pub success: bool,
    pub message: String,
}

// ── Priority ordering for BinaryHeap (lowest value = highest priority) ─────

#[derive(Debug, Clone)]
struct PrioritizedTask {
    task: Task,
    enqueue_order: u64,
}

impl PartialEq for PrioritizedTask {
    fn eq(&self, other: &Self) -> bool {
        self.task.priority == other.task.priority
            && self.enqueue_order == other.enqueue_order
    }
}

impl Eq for PrioritizedTask {}

impl PartialOrd for PrioritizedTask {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for PrioritizedTask {
    fn cmp(&self, other: &Self) -> Ordering {
        // Reverse: lower priority number = higher priority
        other
            .task
            .priority
            .cmp(&self.task.priority)
            .then_with(|| other.enqueue_order.cmp(&self.enqueue_order))
    }
}

// ── Task Queue ─────────────────────────────────────────────────────────────

pub struct TaskQueue {
    heap: BinaryHeap<PrioritizedTask>,
    all_tasks: Vec<Task>,
    enqueue_counter: u64,
}

impl TaskQueue {
    pub fn new() -> Self {
        Self {
            heap: BinaryHeap::new(),
            all_tasks: Vec::new(),
            enqueue_counter: 0,
        }
    }

    /// Add a task to the queue.
    pub fn enqueue(&mut self, mut task: Task) -> Task {
        if task.id.is_empty() {
            task.id = uuid::Uuid::new_v4().to_string();
        }
        if task.created_at.is_empty() {
            task.created_at = now_iso();
        }
        task.status = TaskStatus::Pending;

        let order = self.enqueue_counter;
        self.enqueue_counter = self.enqueue_counter.wrapping_add(1);

        let prioritized = PrioritizedTask {
            task: task.clone(),
            enqueue_order: order,
        };

        self.heap.push(prioritized);
        self.all_tasks.push(task.clone());
        task
    }

    /// Get the next highest-priority task without removing it.
    pub fn peek(&self) -> Option<&Task> {
        self.heap.peek().map(|p| &p.task)
    }

    /// Remove and return the next highest-priority task.
    pub fn dequeue(&mut self) -> Option<Task> {
        self.heap.pop().map(|p| p.task)
    }

    /// Process the next task in the queue synchronously.
    /// Simulates execution based on the task type.
    pub fn process_next(&mut self) -> Result<TaskResult, String> {
        match self.dequeue() {
            Some(task) => {
                let result = Self::execute_task(&task);
                // Update status in all_tasks
                if let Some(t) =
                    self.all_tasks.iter_mut().find(|t| t.id == task.id)
                {
                    t.status = if result.success {
                        TaskStatus::Completed
                    } else {
                        TaskStatus::Failed
                    };
                }
                Ok(result)
            }
            None => Err("Queue is empty".to_string()),
        }
    }

    /// List all tasks (with current status).
    pub fn list_tasks(&self) -> Vec<Task> {
        let mut list = self.all_tasks.clone();
        list.sort_by(|a, b| a.created_at.cmp(&b.created_at));
        list
    }

    /// Get a single task by ID.
    pub fn get_task(&self, id: &str) -> Option<Task> {
        self.all_tasks.iter().find(|t| t.id == id).cloned()
    }

    /// Cancel a pending task.
    pub fn cancel_task(&mut self, id: &str) -> bool {
        if let Some(t) = self.all_tasks.iter_mut().find(|t| t.id == id) {
            if t.status == TaskStatus::Pending {
                t.status = TaskStatus::Cancelled;
                // Rebuild heap without the cancelled task
                let cancelled_id = id.to_string();
                let old = std::mem::take(&mut self.heap);
                self.heap = old
                    .into_iter()
                    .filter(|p| p.task.id != cancelled_id)
                    .collect();
                return true;
            }
        }
        false
    }

    /// Number of pending tasks in the queue.
    pub fn pending_count(&self) -> usize {
        self.heap.len()
    }

    /// Total number of tasks ever enqueued.
    pub fn total_count(&self) -> usize {
        self.all_tasks.len()
    }

    // ── Internal execution ────────────────────────────────────────────

    fn execute_task(task: &Task) -> TaskResult {
        let message = match &task.task_type {
            TaskType::AutoExport => {
                format!(
                    "Auto-export completed: {} (payload: {})",
                    task.name, task.payload
                )
            }
            TaskType::AutoBackup => {
                format!(
                    "Auto-backup completed: {} (payload: {})",
                    task.name, task.payload
                )
            }
            TaskType::MediaCleanup => {
                format!(
                    "Media cleanup completed: {} (payload: {})",
                    task.name, task.payload
                )
            }
            TaskType::ProxyGeneration => {
                format!(
                    "Proxy generation completed: {} (payload: {})",
                    task.name, task.payload
                )
            }
            TaskType::ThumbnailRegeneration => {
                format!(
                    "Thumbnail regeneration completed: {} (payload: {})",
                    task.name, task.payload
                )
            }
        };

        TaskResult {
            task_id: task.id.clone(),
            success: true,
            message,
        }
    }

    /// Spawn a background worker that continuously processes the queue.
    /// Pops the next task, executes it, and sleeps 1 second between polls.
    pub fn start_worker(mut self) {
        tokio::spawn(async move {
            loop {
                if self.heap.is_empty() {
                    tokio::time::sleep(tokio::time::Duration::from_secs(1))
                        .await;
                    continue;
                }

                match self.process_next() {
                    Ok(result) => {
                        println!(
                            "[TaskQueue] Processed {} (success={}): {}",
                            result.task_id, result.success, result.message
                        );
                    }
                    Err(e) => {
                        eprintln!("[TaskQueue] Worker error: {e}");
                    }
                }

                tokio::time::sleep(tokio::time::Duration::from_secs(1))
                    .await;
            }
        });
    }
}

impl Default for TaskQueue {
    fn default() -> Self {
        Self::new()
    }
}

fn now_iso() -> String {
    use std::time::SystemTime;
    let dur = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = dur.as_secs();
    let days = secs / 86400;
    let time_secs = secs % 86400;
    let hours = time_secs / 3600;
    let minutes = (time_secs % 3600) / 60;
    let seconds = time_secs % 60;

    let mut year = 1970i64;
    let mut remaining_days = days as i64;
    loop {
        let dys =
            if (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0) {
                366
            } else {
                365
            };
        if remaining_days < dys {
            break;
        }
        remaining_days -= dys;
        year += 1;
    }
    let leap =
        (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    let mdays = if leap {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };
    let doy = remaining_days as u64 + 1;
    let (month, day) = {
        let mut d = doy;
        let mut m = 1;
        for &md in &mdays {
            if d <= md {
                break;
            }
            d -= md;
            m += 1;
        }
        (m, d)
    };
    format!(
        "{year:04}-{month:02}-{day:02}T{hours:02}:{minutes:02}:{seconds:02}Z"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_enqueue_dequeue() {
        let mut q = TaskQueue::new();
        let t1 = Task {
            id: "t1".into(),
            name: "Export v3".into(),
            payload: "project_123".into(),
            priority: 10,
            status: TaskStatus::Pending,
            created_at: "".into(),
            task_type: TaskType::AutoExport,
        };
        let t2 = Task {
            id: "t2".into(),
            name: "Backup".into(),
            payload: "project_123".into(),
            priority: 5,
            status: TaskStatus::Pending,
            created_at: "".into(),
            task_type: TaskType::AutoBackup,
        };

        q.enqueue(t1);
        q.enqueue(t2);

        // t2 has higher priority (5 < 10), so it should dequeue first
        let next = q.dequeue().unwrap();
        assert_eq!(next.id, "t2");
        assert_eq!(next.priority, 5);
    }

    #[test]
    fn test_process_next() {
        let mut q = TaskQueue::new();
        q.enqueue(Task {
            id: "t1".into(),
            name: "Cleanup".into(),
            payload: "/tmp/old".into(),
            priority: 1,
            status: TaskStatus::Pending,
            created_at: "".into(),
            task_type: TaskType::MediaCleanup,
        });

        let result = q.process_next().unwrap();
        assert!(result.success);
        assert_eq!(result.task_id, "t1");

        // Queue should be empty now
        assert!(q.process_next().is_err());
    }

    #[test]
    fn test_cancel_task() {
        let mut q = TaskQueue::new();
        q.enqueue(Task {
            id: "t1".into(),
            name: "Export".into(),
            payload: "proj".into(),
            priority: 5,
            status: TaskStatus::Pending,
            created_at: "".into(),
            task_type: TaskType::AutoExport,
        });

        assert!(q.cancel_task("t1"));
        assert_eq!(q.pending_count(), 0);
        let task = q.get_task("t1").unwrap();
        assert_eq!(task.status, TaskStatus::Cancelled);
    }

    #[test]
    fn test_pending_count() {
        let mut q = TaskQueue::new();
        assert_eq!(q.pending_count(), 0);

        q.enqueue(Task {
            id: "".into(),
            name: "T1".into(),
            payload: "".into(),
            priority: 1,
            status: TaskStatus::Pending,
            created_at: "".into(),
            task_type: TaskType::AutoExport,
        });
        q.enqueue(Task {
            id: "".into(),
            name: "T2".into(),
            payload: "".into(),
            priority: 2,
            status: TaskStatus::Pending,
            created_at: "".into(),
            task_type: TaskType::AutoExport,
        });

        assert_eq!(q.pending_count(), 2);
        assert_eq!(q.total_count(), 2);
    }
}
