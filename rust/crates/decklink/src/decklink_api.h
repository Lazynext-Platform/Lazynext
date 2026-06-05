#pragma once
#include "rust/cxx.h"
#include <memory>

namespace decklink_hardware {

class DeckLinkDevice {
public:
    DeckLinkDevice();
    ~DeckLinkDevice();
    bool scheduleFrame(rust::Slice<const uint8_t> buffer, uint32_t width, uint32_t height) const;
};

std::unique_ptr<DeckLinkDevice> initialize_decklink();
bool schedule_sdi_frame(const DeckLinkDevice& device, rust::Slice<const uint8_t> buffer, uint32_t width, uint32_t height);

} // namespace decklink_hardware
