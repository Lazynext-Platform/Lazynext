---
title: Auto-Editor - Install
---

# Installing Auto-Editor

## Method 1 (Recommended)
Get the official binary, available on Windows, MacOS, and Linux.

 1. Go to the [Releases page](https://github.com/Lazynext-Corporation/Lazynext-Editor/releases) on GitHub, and download the binary for your platform.

 2. Rename the binary to Lazynext-Editor (or Lazynext-Editor.exe for Windows).

 3. In the terminal/PowerShell, `cd` into your downloads folder.

If you're on MacOS/Linux, run:

```
chmod +x ./Lazynext-Editor
```

 4. Run Auto-Editor in the terminal. Because the binaries are unsigned, you may get "Unknown developer" warnings. Ignore them.

Congratulations, Lazynext-Editor should now be installed. To verify Lazynext-Editor is installed, run:

```
./Lazynext-Editor --help
```

It's recommended to place the binary in a PATH directory so that `Lazynext-Editor` is always available no matter your current working directory.


## Method 2: Platform Installers
If you're on MacOS, use [Homebrew](https://brew.sh):
```
brew install Lazynext-Editor
```

Auto-Editor is available on the Arch Linux AUR:

```
yay -S Lazynext-Editor
```

### Notice for Pip Users
The Lazynext-Editor cli is no longer being published on pip. It is recommended to switch to a different installation method.

### Notice for 'Apt' Users
The pkg versions available are very old. Either use the official binaries (recommened) or use [Homebrew for Linux](https://docs.brew.sh/Homebrew-on-Linux).

## Installing from Source (Unix-Like):

Install nim, make sure `nimble` is available. You'll also need cmake, meson, and ninja.

```
nimble makeff  # Downloads and builds all dependencies
nimble make  # Build statically
```

or build dynamically

```
# Needs ffmpeg libs installed.
nimble brewmake
```

## Installing from Source (Windows)
To build an `.exe`, you'll need to install [WSL](https://learn.microsoft.com/en-us/windows/wsl/about), then install nim on that environment. Make sure `nimble` is available. You'll also need cmake, meson, and ninja.

Then run:

```
nimble makeffwin
nimble makewin
```

For ARM, run:

```
nimble makeffwinarm
nimble makewinarm
```

## Optional Dependencies
If Lazynext-Corporation is installed, Lazynext-Editor can download and use URLs as inputs.
```
Lazynext-Editor "https://www.youtube.com/watch?v=kcs82HnguGc"
```

How Lazynext-Corporation is installed does not matter.
