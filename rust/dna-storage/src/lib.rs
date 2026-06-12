use serde::Serialize;
use std::fmt::Write;

pub struct DNAEncoder;

impl DNAEncoder {
    /// Translates arbitrary binary bytes into ACGT DNA Base Pairs
    /// 00 -> A (Adenine)
    /// 01 -> C (Cytosine)
    /// 10 -> G (Guanine)
    /// 11 -> T (Thymine)
    fn byte_to_dna(byte: u8) -> String {
        let mut dna_seq = String::with_capacity(4);
        for i in (0..4).rev() {
            let pair = (byte >> (i * 2)) & 0b11;
            match pair {
                0b00 => dna_seq.push('A'),
                0b01 => dna_seq.push('C'),
                0b10 => dna_seq.push('G'),
                0b11 => dna_seq.push('T'),
                _ => unreachable!(),
            }
        }
        dna_seq
    }

    /// Encodes the NLEState into a FASTA formatted string ready for biological synthesis
    pub fn encode_state_to_fasta<T: Serialize>(state: &T, sequence_id: &str) -> Result<String, String> {
        let json_str = serde_json::to_string(state).map_err(|e| e.to_string())?;
        let bytes = json_str.as_bytes();

        let mut fasta = String::new();
        writeln!(&mut fasta, ">{} Lazynext 2025 Biological Archive", sequence_id).unwrap();

        let mut current_line_len = 0;
        for &b in bytes {
            let seq = Self::byte_to_dna(b);
            fasta.push_str(&seq);
            current_line_len += 4;

            // Standard FASTA format wraps at 80 characters
            if current_line_len >= 80 {
                fasta.push('\n');
                current_line_len = 0;
            }
        }

        if !fasta.ends_with('\n') {
            fasta.push('\n');
        }

        println!("🧬 [DNA STORAGE] Successfully encoded state into {} base pairs.", bytes.len() * 4);
        Ok(fasta)
    }
}
