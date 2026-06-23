use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Entity Graph cohesion
///
/// Keeps style choices and entity constraints consistent across a project's chunks.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct EntityGraph {
    /// Maps a global semantic entity (e.g., "caption_style", "brand_color") to its serialized value
    pub entities: HashMap<String, String>,
    
    /// Maps timeline clip/track IDs to global entities
    pub links: HashMap<String, Vec<String>>,
}

impl EntityGraph {
    pub fn new() -> Self {
        Self {
            entities: HashMap::new(),
            links: HashMap::new(),
        }
    }

    /// Set an entity's global value
    pub fn set_entity(&mut self, entity_id: &str, value: &str) {
        self.entities.insert(entity_id.to_string(), value.to_string());
    }

    /// Get an entity's global value
    pub fn get_entity(&self, entity_id: &str) -> Option<&String> {
        self.entities.get(entity_id)
    }

    /// Link a specific timeline clip to an entity
    pub fn link_clip_to_entity(&mut self, clip_id: &str, entity_id: &str) {
        self.links.entry(clip_id.to_string())
            .or_insert_with(Vec::new)
            .push(entity_id.to_string());
    }

    /// Get all entities linked to a clip
    pub fn get_linked_entities(&self, clip_id: &str) -> Vec<&String> {
        self.links.get(clip_id)
            .map(|entity_ids| {
                entity_ids.iter()
                    .filter_map(|eid| self.entities.get(eid))
                    .collect()
            })
            .unwrap_or_default()
    }
}
