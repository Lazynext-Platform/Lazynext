use serde_wasm_bindgen::to_value;
use wasm_bindgen::prelude::*;

/// Prepare an export manifest for the given format.
#[wasm_bindgen(js_name = "prepareExportManifest")]
pub fn prepare_export_manifest(
    format: String,
    width: u32,
    height: u32,
    framerate: u32,
    output_path: String,
) -> Result<JsValue, JsValue> {
    let config = serde_json::json!({
        "format": format,
        "width": width,
        "height": height,
        "framerate": framerate,
        "outputPath": output_path,
        "ffmpegCommand": build_ffmpeg_command_str(&format, width, height, framerate, &output_path)
    });

    to_value(&config).map_err(|e| JsValue::from_str(&e.to_string()))
}

fn build_ffmpeg_command_str(
    format: &str,
    width: u32,
    height: u32,
    framerate: u32,
    output_path: &str,
) -> String {
    let codec = match format {
        "prores" => "prores_ks -profile:v 3",
        "dcp" => "jpeg2000",
        "aaf" => "dnxhd",
        _ => "libx264 -preset medium",
    };

    let pix_fmt = match format {
        "prores" => "yuv422p10le",
        "dcp" => "xyz12le",
        _ => "yuv420p",
    };

    format!(
        "ffmpeg -f rawvideo -pix_fmt rgba -s {}x{} -r {} -i - -c:v {} -pix_fmt {} -y {}",
        width, height, framerate, codec, pix_fmt, output_path
    )
}

/// Build an AAF composition manifest (XML).
#[wasm_bindgen(js_name = "buildAafManifest")]
pub fn build_aaf_manifest(project_name: String, clip_ids_js: JsValue) -> Result<String, JsValue> {
    let clip_ids: Vec<String> = serde_wasm_bindgen::from_value(clip_ids_js)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let timestamp = chrono::Utc::now().to_rfc3339();
    let mut xml = String::new();
    xml.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
    xml.push_str("<AAFManifest version=\"1.0\">\n");
    xml.push_str(&format!("  <ProjectName>{}</ProjectName>\n", project_name));
    xml.push_str(&format!("  <CreatedAt>{}</CreatedAt>\n", timestamp));
    xml.push_str("  <Clips>\n");
    for id in &clip_ids {
        xml.push_str(&format!("    <Clip id=\"{}\" />\n", id));
    }
    xml.push_str("  </Clips>\n");
    xml.push_str("</AAFManifest>\n");

    Ok(xml)
}

/// Build a DCP Composition Playlist (CPL) XML.
#[wasm_bindgen(js_name = "buildDcpCpl")]
pub fn build_dcp_cpl(
    project_name: String,
    reel_count: u32,
    duration_frames: u32,
) -> Result<String, JsValue> {
    let uuid = uuid::Uuid::new_v4().to_string();
    let timestamp = chrono::Utc::now().to_rfc3339();

    let mut xml = String::new();
    xml.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
    xml.push_str(&format!(
        "<CompositionPlaylist xmlns=\"http://www.digicine.com/PROTO-ASDCP-CPL-20040511#\">\n"
    ));
    xml.push_str(&format!("  <Id>urn:uuid:{}</Id>\n", uuid));
    xml.push_str(&format!(
        "  <ContentTitleText>{}</ContentTitleText>\n",
        project_name
    ));
    xml.push_str(&format!("  <IssueDate>{}</IssueDate>\n", timestamp));
    xml.push_str("  <ReelList>\n");

    for i in 0..reel_count {
        xml.push_str("    <Reel>\n");
        xml.push_str(&format!(
            "      <Id>urn:uuid:{}</Id>\n",
            uuid::Uuid::new_v4()
        ));
        xml.push_str(&format!(
            "      <Duration>{}</Duration>\n",
            duration_frames / reel_count.max(1)
        ));
        xml.push_str("    </Reel>\n");
    }

    xml.push_str("  </ReelList>\n");
    xml.push_str("</CompositionPlaylist>\n");

    Ok(xml)
}
