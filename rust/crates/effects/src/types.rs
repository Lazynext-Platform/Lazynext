//! Shared effect types for the GPU effects pipeline.
//!
//! Defines `EffectPass` (a named shader with uniform parameters) and
//! `UniformValue` (scalar or vector uniforms) used to describe GPU
//! effect passes on compositor layers.

use std::collections::HashMap;

/// A single GPU effect pass — a named shader with uniform parameters.
#[derive(Clone, Debug)]
pub struct EffectPass {
    /// Name of the shader to run for this pass.
    pub shader: String,
    /// Uniform parameters passed to the shader, keyed by name.
    pub uniforms: HashMap<String, UniformValue>,
}

/// A value that can be passed to an effect shader uniform.
/// All values are sanitized at creation time: NaN values are rejected and
/// values are clamped to a safe range to prevent GPU pipeline errors.
#[derive(Clone, Debug)]
pub enum UniformValue {
    /// A scalar float value.
    Number(f32),
    /// A variable-length vector of floats.
    Vector(Vec<f32>),
}

impl UniformValue {
    /// Creates a Number uniform if the value is finite.
    /// Returns None for NaN or infinite values.
    pub fn number(value: f32) -> Option<Self> {
        if value.is_finite() {
            Some(Self::Number(value.clamp(-1000.0, 1000.0)))
        } else {
            None
        }
    }

    /// Creates a Vector uniform if all values are finite.
    /// Returns None if any value is non-finite or the vector is empty.
    pub fn vector(values: Vec<f32>) -> Option<Self> {
        if values.is_empty() {
            return None;
        }
        if values.iter().all(|v| v.is_finite()) {
            let clamped: Vec<f32> = values
                .into_iter()
                .map(|v| v.clamp(-1000.0, 1000.0))
                .collect();
            Some(Self::Vector(clamped))
        } else {
            None
        }
    }
}
