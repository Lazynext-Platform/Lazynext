pub struct Vector3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

pub struct Transform3D {
    pub position: Vector3,
    pub rotation: Vector3, // Euler angles (Pitch, Yaw, Roll)
    pub scale: Vector3,
}

impl Transform3D {
    pub fn new() -> Self {
        Self {
            position: Vector3 { x: 0.0, y: 0.0, z: 0.0 },
            rotation: Vector3 { x: 0.0, y: 0.0, z: 0.0 },
            scale: Vector3 { x: 1.0, y: 1.0, z: 1.0 },
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

pub struct Camera3D {
    pub position: Vector3,
    pub fov_degrees: f32,
    pub depth_of_field: f32,
}

impl Camera3D {
    /// Computes the Perspective Projection Matrix for WebGPU
    pub fn compute_projection_matrix(&self, aspect_ratio: f32) -> [[f32; 4]; 4] {
        println!("Computing 3D perspective projection with FOV: {}", self.fov_degrees);
        // Mock projection matrix
        [
            [1.0 / (aspect_ratio * (self.fov_degrees / 2.0).tan()), 0.0, 0.0, 0.0],
            [0.0, 1.0 / (self.fov_degrees / 2.0).tan(), 0.0, 0.0],
            [0.0, 0.0, -1.0, -1.0],
            [0.0, 0.0, -0.1, 0.0],
        ]
    }
}
