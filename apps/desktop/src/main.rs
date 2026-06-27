//! Lazynext Desktop — Native GPU-accelerated video editor.
//!
//! Built on wgpu for rendering and winit for windowing.
//! The Rust NLE engine (lazynext_core) drives all editing logic.

use lazynext_core::NLEState;
use std::sync::Arc;
use tokio::sync::Mutex;
use winit::{
    application::ApplicationHandler,
    event::WindowEvent,
    event_loop::{ActiveEventLoop, EventLoop},
    window::Window,
};

struct GpuState {
    surface: wgpu::Surface<'static>,
    device: wgpu::Device,
    queue: wgpu::Queue,
    config: wgpu::SurfaceConfiguration,
}

struct DesktopApp {
    #[allow(dead_code)]
    nle: Arc<Mutex<NLEState>>,
    window: Option<Arc<Window>>,
    gpu: Option<GpuState>,
}

impl DesktopApp {
    fn new(nle: Arc<Mutex<NLEState>>) -> Self {
        Self {
            nle,
            window: None,
            gpu: None,
        }
    }

    fn init_gpu(window: &Arc<Window>) -> GpuState {
        let size = window.inner_size();

        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::all(),
            ..Default::default()
        });

        let surface = instance
            .create_surface(window.clone())
            .expect("Failed to create wgpu surface");

        let adapter = pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions {
            power_preference: wgpu::PowerPreference::HighPerformance,
            compatible_surface: Some(&surface),
            force_fallback_adapter: false,
        }))
        .expect("No suitable GPU adapter found");

        let (device, queue) = pollster::block_on(adapter.request_device(
            &wgpu::DeviceDescriptor {
                required_features: wgpu::Features::default(),
                required_limits: wgpu::Limits::default(),
                label: Some("lazynext-desktop-device"),
                memory_hints: Default::default(),
            },
            None,
        ))
        .expect("Failed to create wgpu device");

        let surface_caps = surface.get_capabilities(&adapter);
        let surface_format = surface_caps
            .formats
            .iter()
            .find(|f| f.is_srgb())
            .copied()
            .unwrap_or(surface_caps.formats[0]);

        let config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            format: surface_format,
            width: size.width,
            height: size.height,
            present_mode: wgpu::PresentMode::AutoVsync,
            alpha_mode: surface_caps.alpha_modes[0],
            view_formats: vec![],
            desired_maximum_frame_latency: 2,
        };

        surface.configure(&device, &config);
        log::info!(
            "GPU initialized: {:?} — {}x{} ({:?})",
            adapter.get_info(),
            size.width,
            size.height,
            surface_format
        );

        GpuState {
            surface,
            device,
            queue,
            config,
        }
    }

    fn render(gpu: &GpuState) -> Result<(), wgpu::SurfaceError> {
        let output = gpu.surface.get_current_texture()?;
        let view = output
            .texture
            .create_view(&wgpu::TextureViewDescriptor::default());

        let mut encoder = gpu
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("lazynext-frame-encoder"),
            });

        {
            let _pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("lazynext-clear-pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color {
                            r: 0.02,
                            g: 0.02,
                            b: 0.02,
                            a: 1.0,
                        }),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
            });
        }

        gpu.queue.submit(std::iter::once(encoder.finish()));
        output.present();
        Ok(())
    }

    fn handle_resize(&mut self, size: winit::dpi::PhysicalSize<u32>) {
        if size.width > 0 && size.height > 0 {
            if let Some(gpu) = &mut self.gpu {
                gpu.config.width = size.width;
                gpu.config.height = size.height;
                gpu.surface.configure(&gpu.device, &gpu.config);
            }
        }
    }
}

impl ApplicationHandler for DesktopApp {
    fn resumed(&mut self, event_loop: &ActiveEventLoop) {
        if self.window.is_some() {
            return;
        }

        let window_attrs = Window::default_attributes()
            .with_title("Lazynext Desktop — AI Video Editor")
            .with_inner_size(winit::dpi::LogicalSize::new(1920.0, 1080.0));

        let window = Arc::new(
            event_loop
                .create_window(window_attrs)
                .expect("Failed to create window"),
        );
        log::info!("Window created: 1920x1080");

        let gpu = Self::init_gpu(&window);
        self.gpu = Some(gpu);
        self.window = Some(window.clone());
        window.request_redraw();
    }

    fn window_event(
        &mut self,
        event_loop: &ActiveEventLoop,
        _window_id: winit::window::WindowId,
        event: WindowEvent,
    ) {
        match event {
            WindowEvent::CloseRequested => {
                log::info!("Shutting down.");
                event_loop.exit();
            }
            WindowEvent::RedrawRequested => {
                if let Some(gpu) = &self.gpu {
                    match Self::render(gpu) {
                        Ok(()) => {}
                        Err(wgpu::SurfaceError::Lost | wgpu::SurfaceError::Outdated) => {
                            if let Some(gpu) = &self.gpu {
                                gpu.surface.configure(&gpu.device, &gpu.config);
                            }
                        }
                        Err(wgpu::SurfaceError::OutOfMemory) => {
                            log::error!("GPU out of memory — exiting.");
                            event_loop.exit();
                        }
                        Err(e) => log::error!("Surface error: {:?}", e),
                    }
                }
                if let Some(ref window) = self.window {
                    window.request_redraw();
                }
            }
            WindowEvent::Resized(physical_size) => {
                self.handle_resize(physical_size);
            }
            _ => {}
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();
    log::info!("🎬 Lazynext Desktop starting...");

    let nle = Arc::new(Mutex::new(NLEState::new(
        "desktop_session_1".to_string(),
        "Desktop Project".to_string(),
        24,
    )));

    {
        let mut state = nle.lock().await;
        state.add_track("V1".to_string(), "video".to_string());
        state.add_track("A1".to_string(), "audio".to_string());
        log::info!(
            "NLE engine ready: {} tracks",
            state.get_project_data().tracks.len()
        );
    }

    let event_loop = EventLoop::new()?;
    let mut app = DesktopApp::new(nle);

    log::info!("Entering native event loop...");
    event_loop.run_app(&mut app)?;
    Ok(())
}
