// decklink_api.h — C++ interface for the Blackmagic DeckLink SDI bridge.
//
// Declares the CXX-exposed surface consumed by the `decklink` Rust crate:
// a `DeckLinkDevice` RAII wrapper plus free functions for device init and
// scheduling YUV frames over SDI hardware. The current implementation is a
// mock scaffold; real builds link against the Blackmagic DeckLink SDK.
#pragma once
#include "rust/cxx.h"
#include <memory>

namespace decklink_hardware {

// RAII handle to a physical DeckLink output device.
class DeckLinkDevice {
public:
    DeckLinkDevice();
    ~DeckLinkDevice();
    // Schedules a single video frame for SDI output; returns true on success.
    bool scheduleFrame(rust::Slice<const uint8_t> buffer, uint32_t width, uint32_t height) const;
};

// Opens and returns the first available DeckLink output device.
std::unique_ptr<DeckLinkDevice> initialize_decklink();
// Convenience wrapper that schedules a frame on the given device.
bool schedule_sdi_frame(const DeckLinkDevice& device, rust::Slice<const uint8_t> buffer, uint32_t width, uint32_t height);

} // namespace decklink_hardware
