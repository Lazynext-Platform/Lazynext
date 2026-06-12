pub fn extract_silence(path: &str) {
    println!("Extracting silence from {} (Auto-Editor port)", path);
}

pub fn lossless_trim(path: &str, start: f64, end: f64) {
    println!("Trimming {} from {} to {} losslessly (LosslessCut port)", path, start, end);
}
