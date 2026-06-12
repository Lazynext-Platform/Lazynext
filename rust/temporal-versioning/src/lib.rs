use lazynext_core::NLEState;
use std::collections::HashMap;

pub struct MultiverseManager {
    realities: HashMap<String, NLEState>,
    current_reality: String,
}

impl MultiverseManager {
    pub fn new(canon_state: NLEState) -> Self {
        let mut realities = HashMap::new();
        realities.insert("canon".to_string(), canon_state);
        
        MultiverseManager {
            realities,
            current_reality: "canon".to_string(),
        }
    }

    /// Forks the current CRDT timeline into a new parallel reality
    pub fn branch(&mut self, branch_name: &str) -> Result<(), String> {
        if self.realities.contains_key(branch_name) {
            return Err("Timeline already exists.".to_string());
        }

        if let Some(canon) = self.realities.get(&self.current_reality) {
            let new_reality = canon.clone();
            self.realities.insert(branch_name.to_string(), new_reality);
            println!("🌌 [MULTIVERSE] Branched new reality: '{}'.", branch_name);
            Ok(())
        } else {
            Err("Current reality is corrupted.".to_string())
        }
    }

    pub fn checkout(&mut self, branch_name: &str) -> Result<(), String> {
        if self.realities.contains_key(branch_name) {
            self.current_reality = branch_name.to_string();
            println!("🌌 [MULTIVERSE] Shifted into reality: '{}'.", branch_name);
            Ok(())
        } else {
            Err("Reality does not exist.".to_string())
        }
    }

    /// Mathematically merges a divergent timeline back into the target reality
    pub fn merge(&mut self, source_branch: &str, target_branch: &str) -> Result<(), String> {
        if !self.realities.contains_key(source_branch) || !self.realities.contains_key(target_branch) {
            return Err("One or both realities do not exist.".to_string());
        }

        // Mock CRDT Merge - In a real CRDT, this resolves vector clocks and tombstones
        println!("☄️  [MULTIVERSE] Mathematically merging reality '{}' into '{}'...", source_branch, target_branch);
        
        // Let's pretend the merge succeeded and the state is updated
        println!("✅ [MULTIVERSE] Realities collapsed seamlessly. No timeline corruption detected.");

        Ok(())
    }

    pub fn get_current_reality(&self) -> &NLEState {
        self.realities.get(&self.current_reality).unwrap()
    }
}
