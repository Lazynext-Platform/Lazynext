// decklink_api.cc — Mock implementation of the DeckLink SDI bridge.
//
// Provides a stand-in for the Blackmagic DeckLink SDK so the crate builds
// and links on machines without the hardware/SDK present. Each call logs
// what the real SDK path would do (device init, frame scheduling) and
// returns success. Replace the mock bodies with IDeckLinkOutput calls for
// production SDI output.
#include "decklink/src/decklink_api.h"
#include <iostream>

namespace decklink_hardware {

DeckLinkDevice::DeckLinkDevice() {
    std::cout << "[C++] MOCK: Blackmagic DeckLink SDI Card Found and Initialized!" << std::endl;
}

DeckLinkDevice::~DeckLinkDevice() {
    std::cout << "[C++] MOCK: DeckLink Device released." << std::endl;
}

bool DeckLinkDevice::scheduleFrame(rust::Slice<const uint8_t> buffer, uint32_t width, uint32_t height) const {
    // MOCK: This would call the physical Blackmagic SDK
    // IDeckLinkOutput::ScheduleVideoFrame(...)
    std::cout << "[C++] MOCK: Pumped " << width << "x" << height 
              << " 10-bit YUV frame over SDI hardware cable! (" 
              << buffer.size() << " bytes)" << std::endl;
    return true;
}

std::unique_ptr<DeckLinkDevice> initialize_decklink() {
    return std::make_unique<DeckLinkDevice>();
}

bool schedule_sdi_frame(const DeckLinkDevice& device, rust::Slice<const uint8_t> buffer, uint32_t width, uint32_t height) {
    return device.scheduleFrame(buffer, width, height);
}

} // namespace decklink_hardware
