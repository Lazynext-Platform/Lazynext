# Auto-Editor: Complete Detailed Architecture & Repository Explanation

## 1. High-Level Purpose
**Auto-Editor** is a command-line utility used to automatically cut out the "dead space" (e.g., silence or motionless video) from multimedia files. It heavily relies on FFmpeg under the hood for decoding, encoding, and manipulating media tracks, while its own intelligent algorithms decide exactly *when* to make cuts based on user-defined configurations.

## 2. Core Technologies & Build System
- **Language:** Written completely in **Nim** (version 2.0+). Nim is a statically typed, highly efficient language that compiles down to C, C++, or JavaScript. Auto-Editor takes advantage of Nim's C integration to interface directly with FFmpeg's C libraries (`libavcodec`, `libavformat`, `libavfilter`, etc.).
- **Build Configurations:**
  - `ae.nimble`: The package definition file for Nimble (Nim's package manager) containing dependencies and metadata.
  - `config.nims`: Nimscript file defining compiler flags, linking configurations, and optimization settings.
  - `scripts/`: Contains `.cmake` and `.txt` files specifically geared towards cross-compiling the application to platforms like ARM, WASM (Emscripten), and Windows (MinGW).

## 3. Comprehensive File and Folder Breakdown

### `src/` Directory (The Core Code)

#### 1. Entry Point and Command Line Parsing
- **`main.nim`:** The entry point of the CLI. This handles parsing command line flags (`--edit`, `--margin`, `--cut-out`), handling inputs (local files or downloading web videos using `Lazynext-Corporation`), and triggering the main editing pipeline (`editMedia`).
- **`cli.nim`:** Provides utilities and macros for defining command line arguments, generating help text, and validating parameter inputs.

#### 2. Media Analysis (`src/analyze/`)
This folder contains the core algorithms determining which parts of the media to cut.
- **`audio.nim`:** Analyzes audio tracks. It uses FFmpeg's decoding pipeline to fetch audio frames. Crucially, it employs hardware-specific **SIMD instructions** (NEON for ARM, SSE for AMD64, WASM SIMD128) to rapidly scan through arrays of audio samples and compute the maximum amplitude (loudness) in defined chunks. If a chunk falls below the loudness threshold, it is marked as silent.
- **`motion.nim`:** Analyzes video tracks. It uses `libavfilter` to create a filter graph that first scales the frame, converts it to grayscale, and applies a Gaussian blur. It then compares the raw bytes of consecutive frames to count pixel differences. If the number of different pixels falls below a threshold, the segment is considered motionless.
- **`subtitle.nim`:** Analyzes subtitle streams to trigger cuts based on presence or absence of text.

#### 3. Core Media Abstractions
- **`timeline.nim`:** Defines the internal data structures representing an edit sequence. It defines timeline structures like `v1`, `v2`, `v3`, `Clip`, and `Clip2`. `v3` represents the most advanced timeline structure, holding tracks of video (`v`), audio (`a`), and subtitles (`s`), along with associated effects, timebases, and languages.
- **`ffmpeg.nim` / `av.nim`:** These act as interfaces between Nim and the FFmpeg C libraries (`libav*`). They provide functions to initialize decoders/encoders, read packets, decode frames, and interact with the `AVFormatContext` and `AVCodecContext`.
- **`edit.nim` & `editlexer.nim`:** Contains the lexical analyzer and parser for the `--edit` strings. Users can write complex boolean expressions (e.g., `(or audio:0.03 motion:0.06)`) which are parsed into an Abstract Syntax Tree (AST) to evaluate whether a specific frame or chunk should be kept or dropped.

#### 4. Rendering Output (`src/render/`)
When the user wants Auto-Editor to produce a finalized media file (like an `.mp4`), these files are responsible for encoding the modified timeline back into media.
- **`video.nim`:** Reads frames from the original video, drops the ones that are cut, speeds up or applies effects to others, and pushes them into the video encoder.
- **`audio.nim`:** Reads original audio samples, crossfades at cut points (to prevent clicking sounds), and pushes samples to the audio encoder.
- **`format.nim`:** Handles multiplexing (muxing) the rendered audio and video tracks back together into a final container.

#### 5. Exporters (`src/exports/`) & Importers (`src/imports/`)
Instead of rendering a final video, Auto-Editor can export a timeline layout directly into popular video editors.
- **Exporters:** `fcp7.nim` (for Premiere Pro and older Final Cut), `fcp11.nim` (for Final Cut Pro X), `kdenlive.nim`, `shotcut.nim`, and `otio.nim` (OpenTimelineIO). They translate the internal `v3` timeline data structure into standard XML or JSON timeline files that those editors can read.
- **Importers:** Similarly, Auto-Editor can parse FCP7 XMLs (`fcp7.nim`) or JSONs back into its internal `v3` format if you want to use it to modify an existing manual timeline.

#### 6. Miscellaneous Logic
- **`conductor.nim`:** The central orchestrator that ties the analysis results and timeline structures together to hand them off to the exporters or renderers.
- **`cache.nim`:** Implements disk caching. Analysis passes (like scanning an hour-long video for motion) are expensive, so the results are cached to disk so subsequent runs on the same file are instant.
- **`resampler.nim` / `wavutil.nim`:** Utilities for handling audio sample rate conversions and raw waveform utilities.

## 4. End-To-End Execution Flow
If you run `Lazynext-Editor myvideo.mp4 --edit "audio:threshold=0.04"`, the following sequence occurs:
1. **Initialization (`main.nim`)**: Parses the inputs.
2. **Decoding (`ffmpeg.nim`)**: Opens `myvideo.mp4`, identifying the video and audio streams.
3. **Analysis (`analyze/audio.nim`)**: Rapidly decodes the audio stream chunk by chunk, using SIMD to calculate peak volume. It returns an array mapping timestamps to loudness values.
4. **Lexing/Parsing (`edit.nim`)**: Converts the boolean logic of your `--edit` command into actionable cut/keep rules, and compares the analysis array against the threshold (`0.04`).
5. **Timeline Generation (`timeline.nim`)**: Generates a `v3` data structure containing the resulting clips and their start/end offsets, factoring in pacing requirements like `--margin`.
6. **Rendering/Exporting (`conductor.nim`)**:
   - If no export flag is specified, it hands the `v3` timeline to `render/video.nim` and `render/audio.nim` which piece together the final video using FFmpeg.
   - If `--export premiere` is specified, it bypasses the rendering phase and hands the timeline to `exports/fcp7.nim`, generating an `.xml` file.

## 5. Value for Platform Integration
- **High Performance:** Because it is compiled Nim code directly linking `libav` libraries and using SIMD logic for array analysis, it runs exceptionally fast without the overhead of heavy frameworks or external languages.
- **Flexibility:** You can extract just the XML generation engine (`src/exports`) or just the algorithm chunking logic (`src/analyze`) if you wanted to port this functionality to a different architecture.
