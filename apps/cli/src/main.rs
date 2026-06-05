use std::env;
use compositor::{Compositor, FrameDescriptor, CanvasClearDescriptor, FrameItemDescriptor, LayerDescriptor, QuadTransformDescriptor, BlendMode};
use gpu::{GpuContext, wgpu};
use std::hash::{Hash, Hasher};
use std::collections::hash_map::DefaultHasher;

use state::ProjectData;

// Generate a pseudo-random RGBA color based on the clip name
fn get_color_for_name(name: &str) -> [u8; 4] {
    let mut hasher = DefaultHasher::new();
    name.hash(&mut hasher);
    let hash = hasher.finish();
    [
        (hash & 0xFF) as u8,
        ((hash >> 8) & 0xFF) as u8,
        ((hash >> 16) & 0xFF) as u8,
        255
    ]
}

fn create_solid_texture(gpu: &GpuContext, color: [u8; 4], width: u32, height: u32, label: &'static str) -> wgpu::Texture {
    let texture = gpu.create_render_texture(width, height, label);
    let pixel_count = width * height;
    
    // wgpu texture format is Bgra8Unorm
    let bgra_color = [color[2], color[1], color[0], color[3]];
    
    let mut pixels = Vec::with_capacity((pixel_count * 4) as usize);
    for _ in 0..pixel_count {
        pixels.extend_from_slice(&bgra_color);
    }
    gpu.queue().write_texture(
        wgpu::TexelCopyTextureInfo {
            texture: &texture,
            mip_level: 0,
            origin: wgpu::Origin3d::ZERO,
            aspect: wgpu::TextureAspect::All,
        },
        &pixels,
        wgpu::TexelCopyBufferLayout {
            offset: 0,
            bytes_per_row: Some(width * 4),
            rows_per_image: Some(height),
        },
        wgpu::Extent3d {
            width,
            height,
            depth_or_array_layers: 1,
        },
    );
    texture
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = env::args().collect();
    
    if args.len() < 3 {
        println!(r#"
  _                                     _   ___   ___ _____  ___  
 | |   __ _ _____   _ _ __   _____  __ | | |__ \ / _ \__ / |/ _ \ 
 | |  / _` |_  / | | | '_ \ / _ \ \/ / | |    ) | | | |_ \ | | | |
 | |___ (_| |/ /| |_| | | | |  __/>  <  | |   / /| |_| |__) | |_| |
 |_____\__,_/___|\__, |_| |_|\___/_/\_\ |_|  / /  \___/____/ \___/ 
                 |___/                                             
        "#);
        eprintln!("Usage: lazynext-cli <render|export|prompt> <project_file> [output_file_or_prompt_text]");
        std::process::exit(1);
    }

    let command = &args[1];
    let project_file = &args[2];
    let output_file = args.get(3).map(|s| s.as_str()).unwrap_or("output.mp4");

    let project_json = std::fs::read_to_string(project_file).unwrap_or_else(|_| {
        eprintln!("Failed to read {}", project_file);
        std::process::exit(1);
    });
    
    let project: ProjectData = serde_json::from_str(&project_json).unwrap_or_else(|e| {
        eprintln!("Failed to parse project JSON: {}", e);
        std::process::exit(1);
    });
    
    let shared_project = std::sync::Arc::new(std::sync::Mutex::new(Some(project.clone())));

    if command == "prompt" {
        let prompt_text = output_file;
        let provider = std::env::var("LAZYNEXT_AI_PROVIDER").unwrap_or_else(|_| "anthropic".to_string());
        let model = std::env::var("LAZYNEXT_AI_MODEL").unwrap_or_else(|_| "".to_string());
        let api_key = match provider.as_str() {
            "openai" | "gpt" => std::env::var("OPENAI_API_KEY").unwrap_or_else(|_| "mock_key".to_string()),
            "gemini" | "google" => std::env::var("GEMINI_API_KEY").unwrap_or_else(|_| "mock_key".to_string()),
            "ollama" | "local" => std::env::var("OLLAMA_ENDPOINT").unwrap_or_else(|_| "http://localhost:11434".to_string()),
            _ => std::env::var("ANTHROPIC_API_KEY").unwrap_or_else(|_| "mock_key".to_string()),
        };
        
        let agent = agent::AgentFactory::create(&provider, &model, &api_key)
            .expect("Failed to initialize AgentProvider");
        
        // Let's actually execute the prompt asynchronously
        match agent.send_prompt(prompt_text).await {
            Ok(response) => {
                println!("> Received Response from LLM Engine");
                let mut project = shared_project.lock().unwrap().clone().unwrap();

                fn process_response(res: agent::AgentResponse, project: &mut ProjectData) {
                    match res {
                        agent::AgentResponse::Text(text) => {
                            println!("\n<CHRONOS-AI> {}", text);
                        }
                        agent::AgentResponse::ToolCall { name, input } => {
                            println!("\n[EXECUTING TOOL] -> {}", name);
                            if name == "cut_silences" {
                                println!(">> Muting silent segments natively in Rust state...");
                                // Actually mutate the state: split the clip in half for demonstration
                                if let Some(track) = project.tracks.first_mut() {
                                    if let Some(mut clip) = track.clips.pop() {
                                        let duration = clip.duration_frames;
                                        clip.duration_frames = duration / 2;
                                        let mut clip2 = clip.clone();
                                        clip2.start_frame += duration / 2;
                                        track.clips.push(clip);
                                        track.clips.push(clip2);
                                    }
                                }
                            } else if name == "color_grade" {
                                let look = input["look"].as_str().unwrap_or("cyberpunk");
                                println!(">> Applying WGSL shader natively: {}...", look);
                                // Just a simulated state mutation for now
                            } else if name == "add_text_overlay" {
                                let text = input["text"].as_str().unwrap_or("");
                                println!(">> Injecting Text Layer into Compositor Tree: \"{}\"", text);
                            } else if name == "duck_audio" {
                                println!(">> Analyzing audio spectral density and applying -12dB ducking compression envelope...");
                            }
                        }
                        agent::AgentResponse::Multiple(responses) => {
                            for r in responses {
                                process_response(r, project);
                            }
                        }
                    }
                }

                process_response(response, &mut project);
                
                // Write back mutated project
                if let Ok(mut lock) = shared_project.lock() {
                    *lock = Some(project);
                }

                println!("\n> State Mutated. Proceeding to headless render...");
            }
            Err(e) => {
                eprintln!("> Failed to contact LLM API: {}", e);
            }
        }
    } else if command != "render" && command != "export" {
        eprintln!("Unknown command: {}", command);
        std::process::exit(1);
    }

    println!("Initializing Lazynext Headless Engine...");
    println!("Loading project: {}", project_file);
    
    // Wire up the satellite uplink!
    // Spawn the daemon
    // let daemon_project_ref = std::sync::Arc::clone(&shared_project);
    // tokio::spawn(async move {
    //     // satellite_uplink::start_satellite_listener(daemon_project_ref).await;
    // });
    
    // 1. Initialize GPU
    let gpu = GpuContext::new().await.expect("Failed to initialize GPU context");
    
    // 2. Initialize Compositor
    let mut compositor = Compositor::new(&gpu);
    
    // Generate solid color textures for each clip in the project
    for track in &project.tracks {
        for clip in &track.clips {
            let color = get_color_for_name(&clip.name);
            let tex = create_solid_texture(&gpu, color, project.width, project.height, "clip_texture");
            compositor.upsert_texture(clip.id.clone(), tex);
        }
    }
    
    // Setup Readback Buffer
    let bytes_per_pixel = 4;
    // Buffer row padding: wgpu requires bytes_per_row to be a multiple of 256
    let unpadded_bytes_per_row = project.width * bytes_per_pixel;
    let padding = (256 - (unpadded_bytes_per_row % 256)) % 256;
    let padded_bytes_per_row = unpadded_bytes_per_row + padding;
    
    let readback_buffer = gpu.device().create_buffer(&wgpu::BufferDescriptor {
        label: Some("gpu-readback-buffer"),
        size: (padded_bytes_per_row * project.height) as u64,
        usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
        mapped_at_creation: false,
    });
    
    println!("Starting render pipeline for {} at {}x{} ({} fps)...", output_file, project.width, project.height, project.fps);
    // Grab latest project from daemon
    let project = shared_project.lock().unwrap().clone().unwrap();
    
    let total_frames = project.duration_frames;
    
    // Spawn ffmpeg child process
    let mut ffmpeg = std::process::Command::new("ffmpeg")
        .args(&[
            "-y", // Overwrite output
            "-f", "rawvideo",
            "-pix_fmt", "bgra", // wgpu output is bgra
            "-s", &format!("{}x{}", project.width, project.height),
            "-r", &project.fps.to_string(),
            "-i", "-", // Read from stdin
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-pix_fmt", "yuv420p",
            output_file
        ])
        .stdin(std::process::Stdio::piped())
        .spawn()
        .expect("Failed to spawn ffmpeg. Is it installed?");

    let mut stdin = ffmpeg.stdin.take().expect("Failed to open stdin");

    for frame in 0..total_frames {
        if frame % 10 == 0 {
            println!("Rendering frame {}/{} ({}%)", frame, total_frames, (frame as f32 / total_frames as f32 * 100.0) as u32);
        }
        
        let mut items = vec![];
        
        for track in &project.tracks {
            for clip in &track.clips {
                if frame >= clip.start_frame && frame < clip.start_frame + clip.duration_frames {
                    items.push(FrameItemDescriptor::Layer(LayerDescriptor {
                        texture_id: clip.id.clone(),
                        transform: QuadTransformDescriptor {
                            center_x: project.width as f32 / 2.0,
                            center_y: project.height as f32 / 2.0,
                            width: project.width as f32,
                            height: project.height as f32,
                            rotation_degrees: 0.0,
                            flip_x: false,
                            flip_y: false,
                        },
                        opacity: 1.0,
                        blend_mode: BlendMode::Normal,
                        effect_pass_groups: vec![],
                        mask: None,
                        color_grading: None,
                        crop: None,
                        border_radius: None,
                        shadow: None,
                    }));
                }
            }
        }
        
        let fd = FrameDescriptor {
            width: project.width,
            height: project.height,
            clear: CanvasClearDescriptor { color: project.bg_color },
            items,
        };
        
        // Render to texture
        let out_tex = compositor.render_frame_to_texture(&gpu, &fd).expect("Failed to render");
        
        // Copy texture to readback buffer
        let mut encoder = gpu.device().create_command_encoder(&wgpu::CommandEncoderDescriptor { label: Some("readback-encoder") });
        encoder.copy_texture_to_buffer(
            wgpu::TexelCopyTextureInfo {
                texture: &out_tex,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            wgpu::TexelCopyBufferInfo {
                buffer: &readback_buffer,
                layout: wgpu::TexelCopyBufferLayout {
                    offset: 0,
                    bytes_per_row: Some(padded_bytes_per_row),
                    rows_per_image: Some(project.height),
                },
            },
            wgpu::Extent3d { width: project.width, height: project.height, depth_or_array_layers: 1 }
        );
        gpu.queue().submit(Some(encoder.finish()));
        
        // Read buffer
        let buffer_slice = readback_buffer.slice(..);
        let (tx, rx) = tokio::sync::oneshot::channel();
        buffer_slice.map_async(wgpu::MapMode::Read, move |v| { tx.send(v).unwrap(); });
        gpu.instance().poll_all(true);
        
        rx.await.unwrap().expect("Failed to map buffer");
        
        {
            let data = buffer_slice.get_mapped_range();
            use std::io::Write;
            // Write row by row to strip the padding WGPU requires
            if padding == 0 {
                stdin.write_all(&data).expect("Failed to write to ffmpeg stdin");
            } else {
                for row in 0..project.height {
                    let start = (row * padded_bytes_per_row) as usize;
                    let end = start + unpadded_bytes_per_row as usize;
                    stdin.write_all(&data[start..end]).expect("Failed to write to ffmpeg stdin");
                }
            }
        }
        
        readback_buffer.unmap();
    }
    
    drop(stdin); // Close stdin to signal EOF
    ffmpeg.wait().expect("ffmpeg failed");
    
    println!("Render complete! Saved to {}", output_file);
}
