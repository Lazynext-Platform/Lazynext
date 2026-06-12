use crate::models::Project;

pub struct TimelineManager {
    project: Project,
}

impl TimelineManager {
    pub fn new(project: Project) -> Self {
        Self { project }
    }
    
    pub fn render_preview(&self) {
        println!("Rendering preview for project: {}", self.project.name);
    }
}
