//! Plugin manager for loading and executing third-party WASM video effect
//! plugins in a sandboxed environment.

use lazynext_plugin_api::{FrameBuffer, VideoEffect};
use std::collections::HashMap;

/// The PluginManager is responsible for safely executing third-party WASM code
/// within the Lazynext core engine sandbox.
pub struct PluginManager {
    /// Loaded effect plugins keyed by their plugin ID.
    loaded_plugins: HashMap<String, Box<dyn VideoEffect>>,
}

impl Default for PluginManager {
    // Returns a plugin manager with no loaded plugins.
    fn default() -> Self {
        Self::new()
    }
}

impl PluginManager {
    /// Creates a new `PluginManager` with no loaded plugins.
    pub fn new() -> Self {
        PluginManager {
            loaded_plugins: HashMap::new(),
        }
    }

    /// Register a new third-party plugin dynamically.
    pub fn register_plugin(&mut self, plugin: Box<dyn VideoEffect>) {
        println!(
            "Registered Third-Party Plugin: {} ({})",
            plugin.name(),
            plugin.plugin_id()
        );
        self.loaded_plugins
            .insert(plugin.plugin_id().to_string(), plugin);
    }

    /// Execute a plugin on a frame buffer.
    /// Validates the time parameter and returns an error if the plugin is
    /// not loaded. Frame buffer dimensions and data integrity should be
    /// verified by the caller before invoking this method.
    pub fn execute_plugin(
        &self,
        plugin_id: &str,
        frame: &mut FrameBuffer,
        time: f64,
    ) -> Result<(), String> {
        if !time.is_finite() {
            return Err(format!(
                "Invalid time value for plugin '{}': {} (must be finite)",
                plugin_id, time
            ));
        }
        if let Some(plugin) = self.loaded_plugins.get(plugin_id) {
            plugin.process_frame(frame, time);
            Ok(())
        } else {
            Err(format!("Plugin {} not loaded", plugin_id))
        }
    }
}
