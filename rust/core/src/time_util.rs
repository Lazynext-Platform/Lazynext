//! Small time helpers shared across core modules.
//!
//! `core` intentionally avoids a `chrono` dependency, so this provides a
//! dependency-free UTC ISO-8601 timestamp used by the channel, task-queue,
//! and scheduled-routine subsystems.

use std::time::SystemTime;

/// Returns the current UTC time formatted as an ISO-8601 timestamp
/// (`YYYY-MM-DDTHH:MM:SSZ`), computed without external date libraries.
pub(crate) fn now_iso() -> String {
    let dur = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = dur.as_secs();
    let days = secs / 86400;
    let time_secs = secs % 86400;
    let hours = time_secs / 3600;
    let minutes = (time_secs % 3600) / 60;
    let seconds = time_secs % 60;

    // Walk forward from the epoch year, accounting for leap years.
    let mut year = 1970i64;
    let mut remaining_days = days as i64;
    loop {
        let dys = if (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0) {
            366
        } else {
            365
        };
        if remaining_days < dys {
            break;
        }
        remaining_days -= dys;
        year += 1;
    }
    let leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    let mdays = if leap {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };
    let doy = remaining_days as u64 + 1;
    let (month, day) = {
        let mut d = doy;
        let mut m = 1;
        for &md in &mdays {
            if d <= md {
                break;
            }
            d -= md;
            m += 1;
        }
        (m, d)
    };
    format!("{year:04}-{month:02}-{day:02}T{hours:02}:{minutes:02}:{seconds:02}Z")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn now_iso_has_expected_shape() {
        let s = now_iso();
        // YYYY-MM-DDTHH:MM:SSZ  → 20 chars, ends with Z, T at index 10.
        assert_eq!(s.len(), 20, "unexpected timestamp: {s}");
        assert!(s.ends_with('Z'));
        assert_eq!(&s[10..11], "T");
        // Year is at least the epoch and plausibly current-ish.
        let year: i64 = s[0..4].parse().expect("year parses");
        assert!(year >= 1970);
    }
}
