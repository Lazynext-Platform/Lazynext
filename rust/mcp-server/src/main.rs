#![allow(
    dead_code,
    unused_assignments,
    clippy::collapsible_if,
    clippy::collapsible_match
)]
use lazynext_core::autonomous::{AutonomousEditor, VideoIntent};
use lazynext_core::nle_state::NLEState;
use serde_json::{Value, json};
use std::io::{self, BufRead};

/// Lazynext MCP Server — exposes the autonomous editor as an MCP tool.
///
/// Protocol: JSON-RPC 2.0 over stdio (Model Context Protocol).
/// Tools exposed:
///   - autonomous_edit: Execute an AI-powered video editing intent
///   - get_timeline_state: Return the current CRDT timeline as JSON
///   - apply_crdt_operation: Apply a serialized CRDT operation to the timeline
///   - export_project: Export the current timeline to a video file
///   - add_track: Add a new track to the timeline
///   - add_clip: Add a clip to a track
///   - set_keyframe: Set a keyframe on a clip property
///   - analyze_media: Analyze a media file for editing recommendations
///   - get_project_info: Return project metadata and statistics
#[tokio::main]
async fn main() {
    let args: Vec<String> = std::env::args().collect();
    let use_sse = args.iter().any(|arg| arg == "--sse");

    if use_sse {
        eprintln!("📡 Lazynext MCP Server — SSE transport mode is not yet implemented.");
        eprintln!("   The MCP server works over stdio (standard MCP transport).");
        eprintln!("   For HTTP-based MCP access, use the API Gateway at port 8005:");
        eprintln!("     POST http://localhost:8005/api/v1/autonomous_edit");
        eprintln!("   To use the MCP server with Claude Desktop / VS Code:");
        eprintln!("     Configure the MCP client to run: lazynext-mcp-server");
        eprintln!("   The server will communicate over stdio automatically.");
        std::process::exit(1);
    }

    eprintln!("🤖 Lazynext MCP Server started.");
    eprintln!(
        "   Tools: run_lazynext_command, get_timeline_state, apply_crdt_operation, import_media, apply_effect, manage_tracks"
    );

    let editor = AutonomousEditor::new();
    let mut nle = NLEState::new(
        "mcp_session".to_string(),
        "MCP Editor Session".to_string(),
        60,
    );

    // Basic API Key auth (expected in environment for testing)
    let expected_api_key =
        std::env::var("LAZYNEXT_MCP_API_KEY").unwrap_or_else(|_| "default_test_key".to_string());

    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        let req_str = match line {
            Ok(l) => l,
            Err(_) => break,
        };
        if req_str.is_empty() {
            continue;
        }

        let req: Value = match serde_json::from_str(&req_str) {
            Ok(r) => r,
            Err(e) => {
                let err_resp = json!({
                    "jsonrpc": "2.0",
                    "id": null,
                    "error": {"code": -32700, "message": format!("Parse error: {}", e)}
                });
                println!("{}", err_resp);
                continue;
            }
        };

        // Authentication check (expecting params._api_key if the protocol allows it, or a custom method)
        // Since MCP runs over stdio, passing auth in headers isn't possible.
        // We'll require it to be passed in params._api_key on initialization, or just for demonstration:
        let method = req["method"].as_str().unwrap_or("");

        if method != "initialize" {
            let provided_key = req["params"].get("_api_key").and_then(|k| k.as_str());
            if provided_key != Some(&expected_api_key) {
                let err_resp = json!({
                    "jsonrpc": "2.0",
                    "id": req.get("id").cloned().unwrap_or(Value::Null),
                    "error": {"code": -32000, "message": "Unauthorized. Invalid or missing _api_key in params."}
                });
                println!("{}", err_resp);
                continue;
            }
        }

        let id = req.get("id").cloned().unwrap_or(Value::Null);

        let response = match method {
            "tools/list" => json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": {
                    "tools": [
                        {
                            "name": "run_lazynext_command",
                            "description": "Execute an AI-powered video editing intent on the CRDT timeline",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "prompt": {"type": "string", "description": "Natural language editing intent"},
                                    "require_plan_approval": {"type": "boolean", "default": true}
                                },
                                "required": ["prompt"]
                            }
                        },
                        {
                            "name": "get_timeline_state",
                            "description": "Return the current CRDT timeline state as JSON",
                            "inputSchema": {
                                "type": "object",
                                "properties": {}
                            }
                        },
                        {
                            "name": "get_project_info",
                            "description": "Return project metadata: name, framerate, resolution, track/clip counts",
                            "inputSchema": {
                                "type": "object",
                                "properties": {}
                            }
                        },
                        {
                            "name": "apply_crdt_operation",
                            "description": "Apply a serialized CRDT operation to the timeline",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "operation": {"type": "object", "description": "Serialized CRDT operation"}
                                },
                                "required": ["operation"]
                            }
                        },
                        {
                            "name": "add_track",
                            "description": "Add a new track to the timeline (video, audio, text, effect)",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "string", "description": "Track ID"},
                                    "kind": {"type": "string", "description": "Track kind: video, audio, text, effect"}
                                },
                                "required": ["kind"]
                            }
                        },
                        {
                            "name": "add_clip",
                            "description": "Add a clip to a track at a given position",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "track_idx": {"type": "integer", "description": "Track index (0-based)"},
                                    "id": {"type": "string", "description": "Clip ID"},
                                    "clip_type": {"type": "string", "description": "Clip type: video, audio, text, image"},
                                    "name": {"type": "string", "description": "Display name"},
                                    "start": {"type": "integer", "description": "Start frame"},
                                    "end": {"type": "integer", "description": "End frame"}
                                },
                                "required": ["track_idx", "clip_type", "start", "end"]
                            }
                        },
                        {
                            "name": "remove_track",
                            "description": "Remove a track by its index",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "track_idx": {"type": "integer", "description": "Track index to remove"}
                                },
                                "required": ["track_idx"]
                            }
                        },
                        {
                            "name": "remove_clip",
                            "description": "Remove a clip from a specific track",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "track_idx": {"type": "integer", "description": "Track index (0-based)"},
                                    "clip_id": {"type": "string", "description": "Clip ID to remove"}
                                },
                                "required": ["track_idx", "clip_id"]
                            }
                        },
                        {
                            "name": "set_keyframe",
                            "description": "Set a keyframe value for an animated property on a clip",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "track_idx": {"type": "integer", "description": "Track index"},
                                    "clip_id": {"type": "string", "description": "Clip ID"},
                                    "property": {"type": "string", "description": "Property name (opacity, scale_x, scale_y, rotation, position_x, position_y)"},
                                    "frame": {"type": "integer", "description": "Frame number"},
                                    "value": {"type": "number", "description": "Property value"},
                                    "easing": {"type": "string", "description": "Easing: linear, step, ease_in, ease_out, ease_in_out"}
                                },
                                "required": ["track_idx", "clip_id", "property", "frame", "value"]
                            }
                        },
                        {
                            "name": "export_project",
                            "description": "Export the current timeline to a video file (MP4, ProRes, DCP, AAF)",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "format": {"type": "string", "description": "Export format: mp4, mov, prores, dcp, aaf"},
                                    "output_path": {"type": "string", "description": "Output file path"},
                                    "width": {"type": "integer", "description": "Output width"},
                                    "height": {"type": "integer", "description": "Output height"},
                                    "framerate": {"type": "integer", "description": "Output framerate"}
                                },
                                "required": ["format", "output_path"]
                            }
                        },
                        {
                            "name": "analyze_media",
                            "description": "Analyze a media file and return editing recommendations (silence detection, scene cuts, color profile)",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "file_path": {"type": "string", "description": "Path to media file"}
                                },
                                "required": ["file_path"]
                            }
                        },
                        {
                            "name": "import_media",
                            "description": "Import multiple media files into the project bin",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "file_paths": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                        "description": "List of file paths to import"
                                    }
                                },
                                "required": ["file_paths"]
                            }
                        },
                        {
                            "name": "apply_effect",
                            "description": "Apply a video or audio effect to a specific clip",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "track_idx": {"type": "integer", "description": "Track index"},
                                    "clip_id": {"type": "string", "description": "Clip ID"},
                                    "effect_name": {"type": "string", "description": "Name of the effect (e.g. 'blur', 'color_grade')"},
                                    "parameters": {"type": "object", "description": "Effect parameters"}
                                },
                                "required": ["track_idx", "clip_id", "effect_name"]
                            }
                        },
                        {
                            "name": "manage_tracks",
                            "description": "Bulk operations on tracks (reorder, mute, unmute, solo, unsolo, lock, unlock)",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "operation": {"type": "string", "description": "Operation: 'reorder', 'mute', 'unmute', 'solo', 'unsolo', 'lock', 'unlock'"},
                                    "track_indices": {
                                        "type": "array",
                                        "items": {"type": "integer"},
                                        "description": "List of track indices to apply operation to"
                                    }
                                },
                                "required": ["operation", "track_indices"]
                            }
                        }
                    ]
                }
            }),

            "tools/call" => {
                let tool_name = req["params"]["name"].as_str().unwrap_or("");
                match tool_name {
                    "run_lazynext_command" | "autonomous_edit" => {
                        let prompt = req["params"]["arguments"]["prompt"]
                            .as_str()
                            .unwrap_or("")
                            .to_string();
                        let require_plan_approval = req["params"]["arguments"]
                            .get("require_plan_approval")
                            .and_then(|v| v.as_bool())
                            .unwrap_or(true);

                        let intent = VideoIntent {
                            prompt,
                            require_plan_approval,
                            source_files: vec![],
                            llm_provider: None,
                        };

                        match editor.process_intent_with_llm(&mut nle, &intent).await {
                            Ok(msg) => json!({
                                "jsonrpc": "2.0",
                                "id": id,
                                "result": {
                                    "content": [{"type": "text", "text": msg}],
                                    "isError": false
                                }
                            }),
                            Err(e) => json!({
                                "jsonrpc": "2.0",
                                "id": id,
                                "result": {
                                    "content": [{"type": "text", "text": format!("Error: {}", e)}],
                                    "isError": true
                                }
                            }),
                        }
                    }

                    "get_timeline_state" => {
                        let data = nle.get_project_data();
                        let state_json = serde_json::to_string_pretty(data).unwrap_or_default();
                        json!({
                            "jsonrpc": "2.0",
                            "id": id,
                            "result": {
                                "content": [{"type": "text", "text": state_json}],
                                "isError": false
                            }
                        })
                    }

                    "apply_crdt_operation" => {
                        let op_value = &req["params"]["arguments"]["operation"];
                        let op: Result<state::operations::CrdtOperation, _> =
                            serde_json::from_value(op_value.clone());
                        match op {
                            Ok(operation) => {
                                nle.op_log.push(operation);
                                json!({
                                    "jsonrpc": "2.0",
                                    "id": id,
                                    "result": {
                                        "content": [{"type": "text", "text": "Operation applied successfully."}],
                                        "isError": false
                                    }
                                })
                            }
                            Err(e) => json!({
                                "jsonrpc": "2.0",
                                "id": id,
                                "result": {
                                    "content": [{"type": "text", "text": format!("Invalid operation: {}", e)}],
                                    "isError": true
                                }
                            }),
                        }
                    }

                    "get_project_info" => {
                        let pd = nle.get_project_data();
                        let total_clips: usize = pd.tracks.iter().map(|t| t.clips.len()).sum();
                        let info = json!({
                            "name": pd.name,
                            "id": pd.id,
                            "framerate": pd.framerate,
                            "width": pd.width,
                            "height": pd.height,
                            "track_count": pd.tracks.len(),
                            "clip_count": total_clips,
                            "tracks": pd.tracks.iter().map(|t| json!({
                                "id": t.id,
                                "kind": t.kind,
                                "clip_count": t.clips.len()
                            })).collect::<Vec<_>>()
                        });
                        json!({
                            "jsonrpc": "2.0",
                            "id": id,
                            "result": {
                                "content": [{"type": "text", "text": serde_json::to_string_pretty(&info).unwrap_or_default()}],
                                "isError": false
                            }
                        })
                    }

                    "add_track" => {
                        let kind = req["params"]["arguments"]["kind"]
                            .as_str()
                            .unwrap_or("video");
                        let track_id = req["params"]["arguments"]["id"]
                            .as_str()
                            .map(|s| s.to_string())
                            .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
                        nle.add_track(track_id.clone(), kind.to_string());
                        json!({
                            "jsonrpc": "2.0",
                            "id": id,
                            "result": {
                                "content": [{"type": "text", "text": format!("Track '{}' ({}) added.", track_id, kind)}],
                                "isError": false
                            }
                        })
                    }

                    "add_clip" => {
                        let track_idx = req["params"]["arguments"]["track_idx"]
                            .as_u64()
                            .unwrap_or(0) as usize;
                        let clip_id = req["params"]["arguments"]["id"]
                            .as_str()
                            .map(|s| s.to_string())
                            .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
                        let clip_type = req["params"]["arguments"]["clip_type"]
                            .as_str()
                            .unwrap_or("video");
                        let name = req["params"]["arguments"]["name"]
                            .as_str()
                            .unwrap_or("Untitled Clip");
                        let start =
                            req["params"]["arguments"]["start"].as_u64().unwrap_or(0) as u32;
                        let end = req["params"]["arguments"]["end"].as_u64().unwrap_or(300) as u32;
                        nle.add_clip_to_track(
                            track_idx,
                            clip_id.clone(),
                            clip_type.to_string(),
                            name.to_string(),
                            start,
                            end,
                        );
                        json!({
                            "jsonrpc": "2.0",
                            "id": id,
                            "result": {
                                "content": [{"type": "text", "text": format!("Clip '{}' added to track {}.", clip_id, track_idx)}],
                                "isError": false
                            }
                        })
                    }

                    "remove_track" => {
                        let track_idx = req["params"]["arguments"]["track_idx"]
                            .as_u64()
                            .unwrap_or(0) as usize;
                        let ok = nle.remove_track(track_idx);
                        json!({
                            "jsonrpc": "2.0",
                            "id": id,
                            "result": {
                                "content": [{"type": "text", "text": if ok { format!("Track {} removed.", track_idx) } else { "Failed to remove track.".to_string() }}],
                                "isError": !ok
                            }
                        })
                    }

                    "remove_clip" => {
                        let track_idx = req["params"]["arguments"]["track_idx"]
                            .as_u64()
                            .unwrap_or(0) as usize;
                        let clip_id = req["params"]["arguments"]["clip_id"].as_str().unwrap_or("");
                        let ok = nle.remove_clip_from_track(track_idx, clip_id);
                        json!({
                            "jsonrpc": "2.0",
                            "id": id,
                            "result": {
                                "content": [{"type": "text", "text": if ok { format!("Clip '{}' removed from track {}.", clip_id, track_idx) } else { "Failed to remove clip.".to_string() }}],
                                "isError": !ok
                            }
                        })
                    }

                    "set_keyframe" => {
                        let track_idx = req["params"]["arguments"]["track_idx"]
                            .as_u64()
                            .unwrap_or(0) as usize;
                        let clip_id = req["params"]["arguments"]["clip_id"].as_str().unwrap_or("");
                        let property = req["params"]["arguments"]["property"]
                            .as_str()
                            .unwrap_or("opacity");
                        let frame =
                            req["params"]["arguments"]["frame"].as_u64().unwrap_or(0) as u32;
                        let value = req["params"]["arguments"]["value"].as_f64().unwrap_or(0.0);
                        let easing_str = req["params"]["arguments"]["easing"]
                            .as_str()
                            .unwrap_or("linear");
                        let easing = match easing_str {
                            "step" => state::keyframe::Easing::Step,
                            "ease_in" => state::keyframe::Easing::EaseIn,
                            "ease_out" => state::keyframe::Easing::EaseOut,
                            "ease_in_out" => state::keyframe::Easing::EaseInOut,
                            _ => state::keyframe::Easing::Linear,
                        };
                        let ok = nle
                            .set_clip_keyframe(track_idx, clip_id, property, frame, value, easing);
                        json!({
                            "jsonrpc": "2.0",
                            "id": id,
                            "result": {
                                "content": [{"type": "text", "text": if ok {
                                    format!("Keyframe set: {}[{}].{} @ frame {} = {}", track_idx, clip_id, property, frame, value)
                                } else {
                                    "Failed to set keyframe — clip not found.".to_string()
                                }}],
                                "isError": !ok
                            }
                        })
                    }

                    "export_project" => {
                        let format = req["params"]["arguments"]["format"]
                            .as_str()
                            .unwrap_or("mp4");
                        let output_path = req["params"]["arguments"]["output_path"]
                            .as_str()
                            .unwrap_or("./out/export.mp4");
                        let width =
                            req["params"]["arguments"]["width"].as_u64().unwrap_or(1920) as u32;
                        let height = req["params"]["arguments"]["height"]
                            .as_u64()
                            .unwrap_or(1080) as u32;
                        let framerate = req["params"]["arguments"]["framerate"]
                            .as_u64()
                            .unwrap_or(30) as u32;
                        let total_frames = framerate * 10;

                        let export_result: Option<Value>;

                        // Try API Gateway for real GPU-composited export first
                        let api_gw_url = std::env::var("LAZYNEXT_API_GATEWAY_URL")
                            .unwrap_or_else(|_| "http://127.0.0.1:8005".to_string());
                        let client = reqwest::Client::new();
                        match client
                            .post(format!("{}/api/v1/export", api_gw_url))
                            .json(&json!({
                                "format": format,
                                "output_path": output_path,
                                "width": width,
                                "height": height,
                                "framerate": framerate,
                            }))
                            .timeout(std::time::Duration::from_secs(300))
                            .send()
                            .await
                        {
                            Ok(resp) if resp.status().is_success() => {
                                let body: Value = resp.json().await.unwrap_or_default();
                                export_result = Some(json!({
                                    "jsonrpc": "2.0",
                                    "id": id,
                                    "result": {
                                        "content": [{"type": "text", "text": body["message"].as_str().unwrap_or("Export complete via GPU compositor")}],
                                        "isError": false
                                    }
                                }));
                            }
                            _ => {
                                // Fall back to test-pattern export on local ffmpeg
                                let config = lazynext_export::ExportConfig {
                                    format: match format {
                                        "prores" => lazynext_export::ExportFormat::ProRes,
                                        "dcp" => lazynext_export::ExportFormat::Dcp,
                                        "aaf" => lazynext_export::ExportFormat::Aaf,
                                        "mov" => lazynext_export::ExportFormat::Mov,
                                        _ => lazynext_export::ExportFormat::Mp4,
                                    },
                                    width,
                                    height,
                                    framerate,
                                    bitrate_kbps: 8000,
                                    output_path: output_path.to_string(),
                                };
                                let pipeline = lazynext_export::ExportPipeline::new(config);
                                match pipeline
                                    .export(total_frames, |frame_idx| async move {
                                        generate_test_pattern(
                                            frame_idx,
                                            total_frames,
                                            width,
                                            height,
                                        )
                                    })
                                    .await
                                {
                                    Ok(()) => {
                                        export_result = Some(json!({
                                            "jsonrpc": "2.0",
                                            "id": id,
                                            "result": {
                                                "content": [{"type": "text", "text": format!("Export complete (test pattern — API Gateway GPU unavailable). Output: {} ({}x{} @ {}fps)", output_path, width, height, framerate)}],
                                                "isError": false
                                            }
                                        }));
                                    }
                                    Err(e) => {
                                        export_result = Some(json!({
                                            "jsonrpc": "2.0",
                                            "id": id,
                                            "result": {
                                                "content": [{"type": "text", "text": format!("Export failed: {}", e)}],
                                                "isError": true
                                            }
                                        }));
                                    }
                                }
                            }
                        }

                        export_result.unwrap_or_else(|| json!({
                            "jsonrpc": "2.0",
                            "id": id,
                            "result": {
                                "content": [{"type": "text", "text": "Export could not be completed"}],
                                "isError": true
                            }
                        }))
                    }

                    "analyze_media" => {
                        let file_path = req["params"]["arguments"]["file_path"]
                            .as_str()
                            .unwrap_or("");
                        if file_path.is_empty() {
                            json!({
                                "jsonrpc": "2.0",
                                "id": id,
                                "result": {
                                    "content": [{"type": "text", "text": "No file path provided."}],
                                    "isError": true
                                }
                            })
                        } else {
                            // Extract audio to raw f32le using ffmpeg
                            let sample_rate = 44100;
                            let output = std::process::Command::new("ffmpeg")
                                .arg("-i")
                                .arg(file_path)
                                .arg("-f")
                                .arg("f32le")
                                .arg("-ac")
                                .arg("1") // mono
                                .arg("-ar")
                                .arg(sample_rate.to_string())
                                .arg("-") // output to stdout
                                .stderr(std::process::Stdio::null())
                                .stdout(std::process::Stdio::piped())
                                .output();

                            let (cuts_count, dur_secs) = match output {
                                Ok(out) if out.status.success() => {
                                    // convert bytes to f32 to f64
                                    let mut samples = Vec::with_capacity(out.stdout.len() / 4);
                                    let mut chunks = out.stdout.chunks_exact(4);
                                    for chunk in &mut chunks {
                                        let mut bytes = [0u8; 4];
                                        bytes.copy_from_slice(chunk);
                                        let sample = f32::from_le_bytes(bytes) as f64;
                                        samples.push(sample);
                                    }
                                    let analysis = editor_core::processing::extract_silence(
                                        &samples,
                                        sample_rate,
                                        -40.0,
                                        500,
                                    );
                                    let duration = samples.len() as f64 / sample_rate as f64;
                                    (analysis.len(), duration)
                                }
                                _ => (0, 0.0), // Fallback if ffmpeg fails
                            };

                            let result_text = format!(
                                "Media analysis for '{}':\n\
                                 Duration: {:.1} seconds\n\
                                 Silence segments detected: {}\n\
                                 Recommended actions:\n\
                                 - Use 'autonomous_edit' with prompt 'cut silence' to auto-trim\n\
                                 - Use 'autonomous_edit' with prompt 'color grade cinematic' for look\n\
                                 - Use 'autonomous_edit' with prompt 'add music' for score",
                                file_path, dur_secs, cuts_count
                            );
                            json!({
                                "jsonrpc": "2.0",
                                "id": id,
                                "result": {
                                    "content": [{"type": "text", "text": result_text}],
                                    "isError": false
                                }
                            })
                        }
                    }

                    "manage_tracks" => {
                        let op = req["params"]["arguments"]["operation"]
                            .as_str()
                            .unwrap_or("");
                        let track_indices: Vec<usize> = req["params"]["arguments"]["track_indices"]
                            .as_array()
                            .map(|a| {
                                a.iter()
                                    .filter_map(|v| v.as_u64().map(|n| n as usize))
                                    .collect()
                            })
                            .unwrap_or_default();

                        if track_indices.is_empty() {
                            json!({
                                "jsonrpc": "2.0",
                                "id": id,
                                "result": {
                                    "content": [{"type": "text", "text": "No track indices provided."}],
                                    "isError": true
                                }
                            })
                        } else {
                            let mut results = Vec::new();
                            match op {
                                "reorder" => {
                                    // track_indices specifies the new order: [2,0,1] means
                                    // the track currently at index 2 moves to position 0, etc.
                                    // We interpret it as "set the new order of all tracks"
                                    let track_count = nle.get_project_data().tracks.len();
                                    if track_indices.len() == track_count {
                                        // Validate all indices are in range
                                        if track_indices.iter().all(|&i| i < track_count) {
                                            for (new_pos, &old_idx) in
                                                track_indices.iter().enumerate()
                                            {
                                                if new_pos != old_idx {
                                                    nle.set_track_position(old_idx, new_pos);
                                                }
                                            }
                                            results
                                                .push(format!("Reordered {} tracks.", track_count));
                                        } else {
                                            results.push(
                                                "Invalid track indices for reorder.".to_string(),
                                            );
                                        }
                                    } else {
                                        results.push(format!(
                                            "reorder requires {} indices (one per track), got {}.",
                                            track_count,
                                            track_indices.len()
                                        ));
                                    }
                                }
                                "mute" => {
                                    for &idx in &track_indices {
                                        if nle.set_track_muted(idx, true) {
                                            results.push(format!("Track {} muted.", idx));
                                        } else {
                                            results.push(format!("Track {} not found.", idx));
                                        }
                                    }
                                }
                                "unmute" => {
                                    for &idx in &track_indices {
                                        if nle.set_track_muted(idx, false) {
                                            results.push(format!("Track {} unmuted.", idx));
                                        } else {
                                            results.push(format!("Track {} not found.", idx));
                                        }
                                    }
                                }
                                "solo" => {
                                    for &idx in &track_indices {
                                        if nle.set_track_soloed(idx, true) {
                                            results.push(format!("Track {} soloed.", idx));
                                        } else {
                                            results.push(format!("Track {} not found.", idx));
                                        }
                                    }
                                }
                                "unsolo" => {
                                    for &idx in &track_indices {
                                        if nle.set_track_soloed(idx, false) {
                                            results.push(format!("Track {} unsoloed.", idx));
                                        } else {
                                            results.push(format!("Track {} not found.", idx));
                                        }
                                    }
                                }
                                "lock" => {
                                    for &idx in &track_indices {
                                        if nle.set_track_locked(idx, true) {
                                            results.push(format!("Track {} locked.", idx));
                                        } else {
                                            results.push(format!("Track {} not found.", idx));
                                        }
                                    }
                                }
                                "unlock" => {
                                    for &idx in &track_indices {
                                        if nle.set_track_locked(idx, false) {
                                            results.push(format!("Track {} unlocked.", idx));
                                        } else {
                                            results.push(format!("Track {} not found.", idx));
                                        }
                                    }
                                }
                                _ => {
                                    results.push(format!("Unknown operation: {}", op));
                                }
                            }
                            json!({
                                "jsonrpc": "2.0",
                                "id": id,
                                "result": {
                                    "content": [{"type": "text", "text": results.join("\n")}],
                                    "isError": false
                                }
                            })
                        }
                    }

                    "import_media" => {
                        let paths = req["params"]["arguments"]["file_paths"].as_array();
                        let mut imported = Vec::new();
                        let mut failed = Vec::new();

                        if let Some(file_paths) = paths {
                            for path_val in file_paths {
                                let path = path_val.as_str().unwrap_or("");
                                if path.is_empty() {
                                    continue;
                                }
                                let asset_id = uuid::Uuid::new_v4().to_string();
                                // Try to probe media info via ffprobe
                                let (duration, width, height, asset_type) = probe_media(path);
                                let name = std::path::Path::new(path)
                                    .file_name()
                                    .and_then(|n| n.to_str())
                                    .unwrap_or("unknown")
                                    .to_string();

                                if std::path::Path::new(path).exists() {
                                    nle.add_media_asset(lazynext_core::nle_state::MediaAsset {
                                        id: asset_id.clone(),
                                        name: name.clone(),
                                        path_or_url: path.to_string(),
                                        asset_type: asset_type.clone(),
                                        duration,
                                        width,
                                        height,
                                    });
                                    imported.push(format!(
                                        "{} ({}: {}x{} {}s)",
                                        name, asset_type, width, height, duration
                                    ));
                                } else {
                                    failed.push(path.to_string());
                                }
                            }
                        }

                        let mut text = format!(
                            "Imported {} file(s) into project media pool.\n",
                            imported.len()
                        );
                        for entry in &imported {
                            text.push_str(&format!("  ✓ {}\n", entry));
                        }
                        for entry in &failed {
                            text.push_str(&format!("  ✗ {} (file not found)\n", entry));
                        }

                        json!({
                            "jsonrpc": "2.0",
                            "id": id,
                            "result": {
                                "content": [{"type": "text", "text": text}],
                                "isError": false
                            }
                        })
                    }

                    "apply_effect" => {
                        let effect_name = req["params"]["arguments"]["effect_name"]
                            .as_str()
                            .unwrap_or("");
                        let track_idx = req["params"]["arguments"]["track_idx"]
                            .as_u64()
                            .unwrap_or(0) as usize;
                        let clip_id = req["params"]["arguments"]["clip_id"].as_str().unwrap_or("");
                        let parameters = &req["params"]["arguments"]["parameters"];

                        if effect_name.is_empty() || clip_id.is_empty() {
                            json!({
                                "jsonrpc": "2.0",
                                "id": id,
                                "result": {
                                    "content": [{"type": "text", "text": "effect_name and clip_id are required."}],
                                    "isError": true
                                }
                            })
                        } else {
                            // Apply effect parameters as keyframe values on the clip.
                            // For numeric params, use set_clip_keyframe; for others, use update_clip_property.
                            let mut applied = Vec::new();
                            if let Some(params_obj) = parameters.as_object() {
                                for (k, v) in params_obj {
                                    let prop = format!("effect:{}:{}", effect_name, k);
                                    if let Some(num) = v.as_f64() {
                                        if nle.set_clip_keyframe(
                                            track_idx,
                                            clip_id,
                                            &prop,
                                            0,
                                            num,
                                            state::keyframe::Easing::Linear,
                                        ) {
                                            applied.push(format!("{} = {}", k, num));
                                        }
                                    } else if let Some(s) = v.as_str() {
                                        nle.update_clip_property(clip_id, &prop, s.len() as f32);
                                        applied.push(format!("{} = \"{}\"", k, s));
                                    }
                                }
                            }

                            if applied.is_empty() {
                                // No specific params — record the effect presence
                                nle.update_clip_property(
                                    clip_id,
                                    &format!("effect:{}", effect_name),
                                    1.0,
                                );
                            }

                            json!({
                                "jsonrpc": "2.0",
                                "id": id,
                                "result": {
                                    "content": [{"type": "text", "text": format!(
                                        "Applied effect '{}' to clip '{}' (track {}). Params: [{}]",
                                        effect_name, clip_id, track_idx,
                                        applied.join(", ")
                                    )}],
                                    "isError": false
                                }
                            })
                        }
                    }

                    _ => json!({
                        "jsonrpc": "2.0",
                        "id": id,
                        "error": {"code": -32601, "message": format!("Method not found: tools/call {}", tool_name)}
                    }),
                }
            }

            "resources/list" => json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": {
                    "resources": [
                        {
                            "uri": "lazynext://timeline/current",
                            "name": "Current Timeline State",
                            "description": "The full CRDT timeline state as JSON",
                            "mimeType": "application/json"
                        },
                        {
                            "uri": "lazynext://project/info",
                            "name": "Project Information",
                            "description": "Project metadata: name, resolution, framerate, track/clip counts",
                            "mimeType": "application/json"
                        },
                        {
                            "uri": "lazynext://timeline/tracks",
                            "name": "Track List",
                            "description": "All tracks with their clip counts and types",
                            "mimeType": "application/json"
                        },
                        {
                            "uri": "lazynext://crdt/operation-log",
                            "name": "CRDT Operation Log",
                            "description": "The full append-only operation log for sync/debug",
                            "mimeType": "application/json"
                        }
                    ]
                }
            }),

            "prompts/list" => json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": {
                    "prompts": [
                        {
                            "name": "edit_video",
                            "description": "Edit a video using natural language",
                            "arguments": [
                                {"name": "intent", "description": "What you want to do (e.g., 'cut silence', 'add music', 'color grade cinematic')", "required": true}
                            ]
                        },
                        {
                            "name": "create_project",
                            "description": "Create a new video editing project",
                            "arguments": [
                                {"name": "name", "description": "Project name", "required": true},
                                {"name": "width", "description": "Canvas width (default 1920)", "required": false},
                                {"name": "height", "description": "Canvas height (default 1080)", "required": false},
                                {"name": "framerate", "description": "Framerate (default 24)", "required": false}
                            ]
                        },
                        {
                            "name": "export_timeline",
                            "description": "Export the current timeline to a video file",
                            "arguments": [
                                {"name": "format", "description": "Export format: mp4, mov, prores, dcp, aaf", "required": false},
                                {"name": "output_path", "description": "Output file path", "required": false}
                            ]
                        },
                        {
                            "name": "analyze_and_edit",
                            "description": "Analyze media and suggest edits, then apply them",
                            "arguments": [
                                {"name": "file_path", "description": "Path to media file to analyze", "required": true}
                            ]
                        }
                    ]
                }
            }),

            "resources/read" => {
                let uri = req["params"]["uri"].as_str().unwrap_or("");
                let content = match uri {
                    "lazynext://timeline/current" => {
                        serde_json::to_string_pretty(nle.get_project_data()).unwrap_or_default()
                    }
                    "lazynext://project/info" => {
                        let pd = nle.get_project_data();
                        let total_clips: usize = pd.tracks.iter().map(|t| t.clips.len()).sum();
                        serde_json::to_string_pretty(&serde_json::json!({
                            "name": pd.name,
                            "id": pd.id,
                            "framerate": pd.framerate,
                            "width": pd.width,
                            "height": pd.height,
                            "track_count": pd.tracks.len(),
                            "clip_count": total_clips
                        }))
                        .unwrap_or_default()
                    }
                    "lazynext://timeline/tracks" => {
                        let pd = nle.get_project_data();
                        serde_json::to_string_pretty(&pd.tracks).unwrap_or_default()
                    }
                    "lazynext://crdt/operation-log" => {
                        let ops: Vec<_> = nle.op_log.iter().collect();
                        serde_json::to_string_pretty(&ops).unwrap_or_default()
                    }
                    _ => format!("Resource not found: {}", uri),
                };
                json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "result": {
                        "contents": [{
                            "uri": uri,
                            "mimeType": "application/json",
                            "text": content
                        }]
                    }
                })
            }

            "prompts/get" => {
                let prompt_name = req["params"]["name"].as_str().unwrap_or("");
                let args = &req["params"]["arguments"];
                let (description, text) = match prompt_name {
                    "edit_video" => {
                        let intent = args["intent"].as_str().unwrap_or("cut silence");
                        (
                            "Edit a video via natural language",
                            format!(
                                "Use the autonomous_edit tool with prompt: \"{}\" to process the current timeline. Then use get_timeline_state to verify the changes.",
                                intent
                            ),
                        )
                    }
                    "create_project" => {
                        let name = args["name"].as_str().unwrap_or("New Project");
                        let width = args["width"].as_u64().unwrap_or(1920);
                        let height = args["height"].as_u64().unwrap_or(1080);
                        let framerate = args["framerate"].as_u64().unwrap_or(24);
                        (
                            "Create a new video project",
                            format!(
                                "Create a new project named \"{}\" at {}x{} @ {}fps. Use add_track to add video and audio tracks.",
                                name, width, height, framerate
                            ),
                        )
                    }
                    "export_timeline" => {
                        let format = args["format"].as_str().unwrap_or("mp4");
                        let path = args["output_path"].as_str().unwrap_or("./out/export.mp4");
                        (
                            "Export the timeline",
                            format!(
                                "Use the export_project tool with format=\"{}\" and output_path=\"{}\" to render the final video.",
                                format, path
                            ),
                        )
                    }
                    _ => ("Unknown prompt", "Prompt not found.".to_string()),
                };
                json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "result": {
                        "description": description,
                        "messages": [{
                            "role": "user",
                            "content": {
                                "type": "text",
                                "text": text
                            }
                        }]
                    }
                })
            }

            "initialize" => json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {},
                        "resources": {},
                        "prompts": {}
                    },
                    "serverInfo": {
                        "name": "lazynext-mcp-server",
                        "version": env!("CARGO_PKG_VERSION")
                    }
                }
            }),

            _ => json!({
                "jsonrpc": "2.0",
                "id": id,
                "error": {"code": -32601, "message": format!("Method not found: {}", method)}
            }),
        };

        println!("{}", response);
    }
}

/// Generate a test pattern frame for export when the GPU compositor
/// is not available (MCP server runs over stdio, no GPU context).
fn generate_test_pattern(frame_idx: u32, total_frames: u32, width: u32, height: u32) -> Vec<u8> {
    let size = (width * height * 4) as usize;
    let mut pixels = vec![0u8; size];
    let t = frame_idx as f64 / total_frames.max(1) as f64;

    for y in 0..height {
        for x in 0..width {
            let px = x as f64 / width as f64;
            let py = y as f64 / height as f64;
            let wave = ((px * 10.0 + t * 5.0).sin() * 0.5 + 0.5) as f32;
            let idx = ((y * width + x) * 4) as usize;
            pixels[idx] = (wave * 255.0) as u8;
            pixels[idx + 1] = ((1.0 - py as f32) * 200.0) as u8;
            pixels[idx + 2] = ((px as f32) * 255.0) as u8;
            pixels[idx + 3] = 255;
        }
    }
    pixels
}

/// Probe a media file with ffprobe to extract duration, resolution, and type.
/// Falls back to sensible defaults if ffprobe is not available.
fn probe_media(path: &str) -> (f64, u32, u32, String) {
    let output = std::process::Command::new("ffprobe")
        .arg("-v")
        .arg("quiet")
        .arg("-print_format")
        .arg("json")
        .arg("-show_format")
        .arg("-show_streams")
        .arg(path)
        .output();

    match output {
        Ok(out) if out.status.success() => {
            if let Ok(info) = serde_json::from_slice::<serde_json::Value>(&out.stdout) {
                let duration = info["format"]["duration"]
                    .as_str()
                    .and_then(|s| s.parse::<f64>().ok())
                    .unwrap_or(10.0);

                let mut width: u32 = 0;
                let mut height: u32 = 0;
                let mut asset_type = "unknown".to_string();

                if let Some(streams) = info["streams"].as_array() {
                    for stream in streams {
                        let codec_type = stream["codec_type"].as_str().unwrap_or("");
                        match codec_type {
                            "video" => {
                                width = stream["width"].as_u64().unwrap_or(0) as u32;
                                height = stream["height"].as_u64().unwrap_or(0) as u32;
                                asset_type = "video".to_string();
                            }
                            "audio" => {
                                if asset_type == "unknown" {
                                    asset_type = "audio".to_string();
                                }
                            }
                            _ => {}
                        }
                    }
                }

                if width == 0 {
                    width = 1920;
                }
                if height == 0 {
                    height = 1080;
                }

                (duration, width, height, asset_type)
            } else {
                (10.0, 1920, 1080, "unknown".to_string())
            }
        }
        _ => {
            // ffprobe not available — guess type from extension
            let ext = std::path::Path::new(path)
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();
            let asset_type = match ext.as_str() {
                "mp4" | "mov" | "avi" | "mkv" | "webm" | "mxf" => "video",
                "mp3" | "wav" | "aac" | "flac" | "ogg" | "m4a" => "audio",
                "png" | "jpg" | "jpeg" | "gif" | "webp" | "tiff" | "bmp" => "image",
                _ => "unknown",
            }
            .to_string();
            (10.0, 1920, 1080, asset_type)
        }
    }
}
