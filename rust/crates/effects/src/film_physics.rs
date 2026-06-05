use bytemuck::{Pod, Zeroable};

#[repr(C)]
#[derive(Copy, Clone, Debug, Pod, Zeroable)]
pub struct FilmPhysicsUniforms {
    pub time: f32,
    pub halation_intensity: f32,
    pub resolution: [f32; 2],
}

pub struct FilmPhysicsEngine {
    pub current_time: f32,
}

impl FilmPhysicsEngine {
    pub fn new() -> Self {
        Self { current_time: 0.0 }
    }

    pub fn tick(&mut self, delta_time: f32) {
        self.current_time += delta_time;
    }

    pub fn get_uniforms(&self, width: f32, height: f32, intensity: f32) -> FilmPhysicsUniforms {
        FilmPhysicsUniforms {
            time: self.current_time,
            halation_intensity: intensity,
            resolution: [width, height],
        }
    }
}
