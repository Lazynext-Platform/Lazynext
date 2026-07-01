# Lazynext Test Suite

Integration and end-to-end tests for the Lazynext platform.

## Structure

```
tests/
├── assets/                        # Test fixtures (media files, JSON payloads)
├── e2e_pipeline_test.py           # End-to-end pipeline integration test
└── test_python_microservices.py   # Python FastAPI microservice unit/integration tests
```

## Running Tests

### Python Tests

```bash
# Run all Python tests
cd tests
python -m pytest -v

# Run a specific test file
python -m pytest e2e_pipeline_test.py -v
```

### Web E2E Tests

Web end-to-end tests live in `apps/web/tests/` alongside the application:

```bash
cd apps/web
bun run test:e2e
```

### Rust Tests

Rust crate tests are co-located with their source code:

```bash
cd rust
cargo test --workspace
```

## Test Philosophy

- **Unit tests** live alongside source code in each crate/package
- **Integration tests** in this directory test cross-service boundaries
- **E2E tests** verify complete user workflows from browser to compositor

## Adding Tests

1. Python microservice tests: add to `tests/` or co-locate with the service
2. Rust integration tests: add to `tests/` within the affected Rust crate
3. Web E2E tests: add Playwright specs in `apps/web/tests/e2e/`
