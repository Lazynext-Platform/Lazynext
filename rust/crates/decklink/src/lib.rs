#[cxx::bridge(namespace = "decklink_hardware")]
mod ffi {
    unsafe extern "C++" {
        include!("decklink/src/decklink_api.h");

        type DeckLinkDevice;

        fn initialize_decklink() -> UniquePtr<DeckLinkDevice>;
        fn schedule_sdi_frame(
            device: &DeckLinkDevice,
            buffer: &[u8],
            width: u32,
            height: u32,
        ) -> bool;
    }
}

pub struct DecklinkEngine {
    device: cxx::UniquePtr<ffi::DeckLinkDevice>,
}

impl Default for DecklinkEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl DecklinkEngine {
    pub fn new() -> Self {
        println!("Initializing Blackmagic Desktop Video SDK via C++ FFI...");
        Self {
            device: ffi::initialize_decklink(),
        }
    }

    pub fn pump_frame_to_sdi(
        &self,
        buffer: &[u8],
        width: u32,
        height: u32,
    ) -> Result<(), &'static str> {
        let success = ffi::schedule_sdi_frame(&self.device, buffer, width, height);
        if success {
            Ok(())
        } else {
            Err("Failed to schedule frame to DeckLink device")
        }
    }
}
