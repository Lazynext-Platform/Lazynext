//! 3D transform primitives for spatial compositing.
//!
//! Defines `Vector3`, `Transform3D` (position / Euler rotation / scale),
//! and `Camera3D` for placing 2D video layers in 3D space with
//! model and perspective projection matrices for WebGPU.

/// A 3-component vector for positions, rotations, and scale.
pub struct Vector3 {
    /// X component.
    pub x: f32,
    /// Y component.
    pub y: f32,
    /// Z component.
    pub z: f32,
}

/// 3D transform with position, Euler rotation (pitch/yaw/roll), and scale.
pub struct Transform3D {
    /// Translation offset in 3D space.
    pub position: Vector3,
    /// Euler rotation angles (pitch, yaw, roll) in degrees.
    pub rotation: Vector3,
    /// Scale factors along each axis.
    pub scale: Vector3,
}

impl Default for Transform3D {
    // Returns the default (identity) 3D transform.
    fn default() -> Self {
        Self::new()
    }
}

impl Transform3D {
    /// Creates a new `Transform3D` at origin with identity scale and zero rotation.
    pub fn new() -> Self {
        Self {
            position: Vector3 {
                x: 0.0,
                y: 0.0,
                z: 0.0,
            },
            rotation: Vector3 {
                x: 0.0,
                y: 0.0,
                z: 0.0,
            },
            scale: Vector3 {
                x: 1.0,
                y: 1.0,
                z: 1.0,
            },
        }
    }

    /// Computes a 4x4 Model Matrix for WebGPU to transform 2D video planes into 3D space
    pub fn compute_model_matrix(&self) -> [[f32; 4]; 4] {
        // Mock matrix math (normally we'd use `cgmath` or `nalgebra` here)
        println!("Computing 3D model matrix at Z: {}", self.position.z);

        [
            [self.scale.x, 0.0, 0.0, 0.0],
            [0.0, self.scale.y, 0.0, 0.0],
            [0.0, 0.0, self.scale.z, 0.0],
            [self.position.x, self.position.y, self.position.z, 1.0],
        ]
    }
}

/// A perspective camera for viewing 3D composited layers.
pub struct Camera3D {
    /// Camera position in world space.
    pub position: Vector3,
    /// Vertical field of view in degrees.
    pub fov_degrees: f32,
    /// Depth of field focal distance.
    pub depth_of_field: f32,
}

impl Camera3D {
    /// Computes the Perspective Projection Matrix for WebGPU
    pub fn compute_projection_matrix(&self, aspect_ratio: f32) -> [[f32; 4]; 4] {
        println!(
            "Computing 3D perspective projection with FOV: {}",
            self.fov_degrees
        );
        // Mock projection matrix
        [
            [
                1.0 / (aspect_ratio * (self.fov_degrees / 2.0).tan()),
                0.0,
                0.0,
                0.0,
            ],
            [0.0, 1.0 / (self.fov_degrees / 2.0).tan(), 0.0, 0.0],
            [0.0, 0.0, -1.0, -1.0],
            [0.0, 0.0, -0.1, 0.0],
        ]
    }
}
