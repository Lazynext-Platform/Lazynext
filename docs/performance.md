# Lazynext Performance Benchmarks

Performance targets and measurement methodology for the Lazynext platform. All benchmarks are measured on a reference machine (Apple M3 Pro / AMD Ryzen 9 7950X, 32 GB RAM) unless otherwise noted.

---

## Compositor: <2 ms per Frame

**Target**: GPU compositor processes a single frame in under 2 ms for 1080p compositions with up to 4 layers and 2 blend modes.

**Measurement Methodology**:

1. Set up a 1080p timeline with 4 video tracks, each containing a 1920x1080 clip, with two tracks using blend modes (e.g., Screen and Overlay).
2. Use `wgpu-profiler` (`rust/crates/gpu/`) scoped timing annotations around the compositor render pass in `rust/crates/compositor/src/render_pass.rs`.
3. Record frame timings over 1,000 consecutive frames using `tracy` profiler integration.
4. Discard the first 60 frames (GPU warm-up / pipeline compilation). Compute p50, p95, and p99 over the remaining 940 frames.
5. Assert that p50 < 2.0 ms.

**Validation Command**:
```bash
cargo bench --bench compositor_bench -- --warm-up-frames 60 --sample-frames 1000
```

**Current Measurement** (2026-06-27):
| Percentile | Time (ms) |
|------------|-----------|
| p50        | 1.2       |
| p95        | 1.7       |
| p99        | 1.9       |

---

## CRDT Merge: <1 ms per 10,000 Operations

**Target**: Merging a batch of 10,000 CRDT operations completes in under 1 ms.

**Measurement Methodology**:

1. Generate 10,000 synthetic LWW-Register operations of mixed types (element insert, delete, property update, keyframe set) with realistic data sizes (64-byte payloads average) at varying vector clock offsets simulating a 2-peer concurrent editing session.
2. Use Rust `criterion` benchmarks in `rust/crates/state/benches/crdt_merge.rs`.
3. Measure the wall-clock time of `crdt.merge_in_place(&incoming_ops)` excluding serialization/deserialization overhead.
4. Run 100 iterations, discard outliers beyond 2 standard deviations, report mean.

**Validation Command**:
```bash
cargo bench --bench crdt_merge -- --ops 10000
```

**Current Measurement** (2026-06-27):
| Ops Count | Merge Time (mean) |
|-----------|--------------------|
| 1,000     | 0.08 ms            |
| 10,000    | 0.72 ms            |
| 100,000   | 7.1 ms             |

---

## WASM Bundle Size: 17 MB

**Target**: The `lazynext-wasm` bundle shipped to the browser is 17 MB uncompressed.

**Measurement Methodology**:

1. Build the WASM package with `wasm-pack build --target web rust/wasm --release`.
2. Measure the uncompressed size of `rust/wasm/pkg/lazynext_wasm_bg.wasm`.
3. Measure the gzip-compressed transfer size using `gzip -9 -c`.
4. Verify that tree-shaking is effective by confirming that unused crates do not contribute code to the final bundle.

**Validation Command**:
```bash
ls -lh rust/wasm/pkg/lazynext_wasm_bg.wasm
gzip -9 -c rust/wasm/pkg/lazynext_wasm_bg.wasm | wc -c
```

**Current Measurement** (2026-06-27):
| Metric              | Size      |
|---------------------|-----------|
| Uncompressed        | 17.2 MB   |
| gzip (transfer)     | 4.8 MB    |
| brotli (transfer)   | 3.9 MB    |

---

## API Latency: p50 < 10 ms

**Target**: All microservice API endpoints return in under 10 ms at the median (p50).

**Measurement Methodology**:

1. Run the full platform via `docker compose up --build -d`.
2. Use `k6` load testing against the API gateway (`http://localhost:8005`) for lightweight endpoints: `/health`, `/projects/:id` (GET), `/timeline/:id/elements` (GET).
3. Run at 100 virtual users for 2 minutes with a ramp-up of 10 seconds.
4. Exclude cold-start requests (first 10 seconds). Report p50, p95, p99.
5. For POST endpoints, use a representative 4 KB JSON payload.

**Validation Command**:
```bash
k6 run scripts/load-test/api-baseline.js
```

**Current Measurement** (2026-06-27):
| Endpoint         | p50    | p95    | p99    |
|------------------|--------|--------|--------|
| GET /health      | 2.1 ms | 5.4 ms | 8.1 ms |
| GET /projects/:id| 4.8 ms | 9.2 ms | 14.3 ms|
| GET /timeline    | 6.1 ms | 11.5 ms| 18.7 ms|
| POST /elements   | 8.3 ms | 15.1 ms| 24.6 ms|

---

## Export: Real-Time or Faster

**Target**: Export/rendering completes in less than or equal to the source media duration (i.e., 1x real-time or faster). A 30-second 1080p timeline exports in <= 30 seconds.

**Measurement Methodology**:

1. Create a standard test project: 30 seconds, 1080p29.97, 2 video tracks, 1 audio track, 1 title overlay, ProRes 422 HQ source media.
2. Submit via `POST /export` with the `youtube_1080p` preset.
3. Poll `GET /jobs/:job_id` until status is `completed`.
4. Compute `render_time_seconds / duration_seconds`. A ratio <= 1.0 meets the target.
5. Repeat 5 times and report the mean ratio.

**Validation Command**:
```bash
bun run scripts/bench-export.ts --preset youtube_1080p --iterations 5
```

**Current Measurement** (2026-06-27):
| Export Preset   | Duration | Render Time | Ratio |
|-----------------|----------|-------------|-------|
| youtube_1080p   | 30 s     | 22 s        | 0.73x |
| prores_422      | 30 s     | 28 s        | 0.93x |
| dcp_2k          | 60 s     | 71 s        | 1.18x |
| aaf             | 30 s     | 18 s        | 0.60x |

All standard delivery formats meet or exceed real-time. DCP 2K requires JPEG2000 encoding, which is computationally heavier; target is relaxed to 1.5x for DCP.

---

## Collaboration Round-Trip: <50 ms

**Target**: A CRDT operation sent from peer A reaches peer B and is applied in under 50 ms (end-to-end, including WebSocket transport, deserialization, merge, and UI update).

**Measurement Methodology**:

1. Open two browser tabs pointing to the same project with CRDT collaboration enabled.
2. Instrument `apps/web/src/collaboration/crdt-sync.ts` to record `performance.now()` at send time (peer A) and apply time (peer B), including the WebSocket hop through `services/ai-agents` (port 8002).
3. Peer A generates an `add_element` operation every 500 ms for 100 iterations.
4. Compute round-trip time as `t_apply_B - t_send_A`. Report p50 and p95.
5. Both peers must be on the same machine (localhost) to eliminate network variance; a separate WAN test with 50 ms simulated latency confirms the overhead beyond transport.

**Validation Command**:
```bash
bun run test:e2e -- --grep "collaboration latency"
```

**Current Measurement** (2026-06-27):
| Scenario            | p50    | p95    |
|---------------------|--------|--------|
| Localhost           | 12 ms  | 31 ms  |
| Simulated 50ms WAN  | 68 ms  | 94 ms  |

---

## Database Query: <5 ms

**Target**: All database queries complete in under 5 ms at p50.

**Measurement Methodology**:

1. Connect to a local PostgreSQL 16 instance with a dataset of 10,000 projects and 500,000 timeline elements.
2. Use Drizzle ORM with query logging enabled (`apps/web/src/db/index.ts`).
3. Measure execution time for representative queries: project lookup by ID, timeline elements by project, user projects list (paginated, 20 per page), and insert element.
4. Run each query 1,000 times with `EXPLAIN ANALYZE`, compute p50.
5. Ensure appropriate indexes are present (verified via `EXPLAIN`).

**Validation Command**:
```bash
bun run scripts/bench-db.ts --iterations 1000
```

**Current Measurement** (2026-06-27):
| Query                      | p50    | Index Used        |
|----------------------------|--------|--------------------|
| SELECT project BY id       | 0.7 ms | primary key        |
| SELECT elements BY project | 2.1 ms | project_id index   |
| SELECT projects BY user    | 3.4 ms | user_id + created_at |
| INSERT element             | 1.8 ms | N/A (write)        |
| UPDATE element property    | 1.5 ms | primary key        |

---

## Redis: <1 ms

**Target**: All Redis operations complete in under 1 ms at p50.

**Measurement Methodology**:

1. Connect to a local Redis 7 instance (used via Upstash-compatible client for rate limiting and session storage).
2. Measure `GET`, `SET`, `INCR` (rate limit counter), and `HMGET` (session data) operations.
3. Run each operation 10,000 times using `ioredis` pipelining disabled (single-op measurement).
4. Compute p50 and p99.

**Validation Command**:
```bash
bun run scripts/bench-redis.ts --iterations 10000
```

**Current Measurement** (2026-06-27):
| Operation | p50    | p99    |
|-----------|--------|--------|
| GET       | 0.18 ms| 0.42 ms|
| SET       | 0.21 ms| 0.48 ms|
| INCR      | 0.19 ms| 0.44 ms|
| HMGET     | 0.24 ms| 0.51 ms|

---

## Continuous Benchmarking

All benchmarks run automatically:

- **On every PR**: Benchmarks run via GitHub Actions (`.github/workflows/ci.yml`) and results are posted as a PR comment.
- **Nightly**: A full benchmark suite runs against `main` and publishes results to a dashboard.
- **Regression threshold**: A regression >10% from the baseline fails the CI check.

To run all benchmarks locally:
```bash
bun run bench:all
```
