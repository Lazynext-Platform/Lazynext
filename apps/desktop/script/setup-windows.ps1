# Lazynext Desktop — Windows Setup Script
# Run in PowerShell as Administrator for full GPU support

Write-Host "=== Lazynext Desktop — Windows Setup ===" -ForegroundColor Magenta

# 1. Check Rust
if (!(Get-Command rustc -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Rust..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe" -OutFile "$env:TEMP\rustup-init.exe"
    & "$env:TEMP\rustup-init.exe" -y
    $env:Path += ";$env:USERPROFILE\.cargo\bin"
}

# 2. Install Windows build tools (MSVC)
Write-Host "Checking Visual Studio Build Tools..." -ForegroundColor Yellow
if (!(Test-Path "C:\Program Files\Microsoft Visual Studio\2022")) {
    Write-Host "Please install Visual Studio Build Tools 2022 with 'Desktop development with C++' workload"
    Write-Host "Download: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022"
    Write-Host "Select: MSVC v143, Windows 11 SDK, C++ CMake tools"
}

# 3. Install Vulkan SDK for GPU rendering
Write-Host "Checking Vulkan SDK..." -ForegroundColor Yellow
$vulkanPath = "$env:VULKAN_SDK"
if (!$vulkanPath) {
    Write-Host "Installing Vulkan SDK..." -ForegroundColor Yellow
    Write-Host "Download from: https://vulkan.lunarg.com/sdk/home#windows"
    Write-Host "Required for wgpu GPU rendering backend"
}

# 4. Verify installation
Write-Host ""
Write-Host "=== Verification ===" -ForegroundColor Green
rustc --version
cargo --version
Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host "Run: cargo run -p lazynext-desktop"
Write-Host ""
Write-Host "GPU Backends available on Windows:"
Write-Host "  - Vulkan (primary, via wgpu)"
Write-Host "  - DX12 (fallback, via wgpu)"
Write-Host "  - CPU (software fallback)"
