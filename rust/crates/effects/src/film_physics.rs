//! Physically-based film stock simulation.
//!
//! Models real film characteristics: halation (light scattering in the
//! emulsion layer), grain structure, and photochemical color response.
//! The uniform buffer is uploaded to the GPU each frame; the actual
//! film emulation runs as a WGSL compute shader in the effect pipeline.

use bytemuck::{Pod, Zeroable};

/// GPU uniform buffer layout for the film-physics compute shader.
#[repr(C)]
#[derive(Copy, Clone, Debug, Pod, Zeroable)]
pub struct FilmPhysicsUniforms {
    /// Elapsed time in seconds, used to animate grain.
    pub time: f32,
    /// Strength of the halation (light-scatter) effect.
    pub halation_intensity: f32,
    /// Render target size in pixels as `[width, height]`.
    pub resolution: [f32; 2],
}

/// Stateful driver that advances film-physics time and produces per-frame
/// uniforms for the shader.
pub struct FilmPhysicsEngine {
    /// Accumulated simulation time in seconds.
    pub current_time: f32,
}

impl Default for FilmPhysicsEngine {
    // Returns a film-physics engine with its clock at zero.
    fn default() -> Self {
        Self::new()
    }
}

impl FilmPhysicsEngine {
    /// Creates a new engine with the simulation clock at zero.
    pub fn new() -> Self {
        Self { current_time: 0.0 }
    }

    /// Advances the simulation clock by `delta_time` seconds.
    pub fn tick(&mut self, delta_time: f32) {
        self.current_time += delta_time;
    }

    /// Builds the shader uniforms for the current time at the given render
    /// resolution and halation `intensity`.
    pub fn get_uniforms(&self, width: f32, height: f32, intensity: f32) -> FilmPhysicsUniforms {
        FilmPhysicsUniforms {
            time: self.current_time,
            halation_intensity: intensity,
            resolution: [width, height],
        }
    }
}
