//! Shared effect types for the GPU effects pipeline.
//!
//! Defines `EffectPass` (a named shader with uniform parameters) and
//! `UniformValue` (scalar or vector uniforms) used to describe GPU
//! effect passes on compositor layers.

use std::collections::HashMap;

/// A single GPU effect pass — a named shader with uniform parameters.
#[derive(Clone, Debug)]
pub struct EffectPass {
    pub shader: String,
    pub uniforms: HashMap<String, UniformValue>,
}

/// A value that can be passed to an effect shader uniform.
#[derive(Clone, Debug)]
pub enum UniformValue {
    /// A scalar float value.
    Number(f32),
    /// A variable-length vector of floats.
    Vector(Vec<f32>),
}
