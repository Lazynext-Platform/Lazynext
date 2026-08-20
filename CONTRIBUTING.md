# Contributing to Lazynext

Thank you for your interest in contributing to Lazynext! This document outlines the process for contributing to the project.

## Getting Started

### Prerequisites

- **Node.js** 20+ and **npm** 10+
- **Git**
- For desktop development: platform-specific build tools (see `docs/quick-start.md`)

### Setup

```bash
git clone https://github.com/Lazynext-Platform/Lazynext.git
cd Lazynext
npm install
npm run dev
```

### Running Tests

```bash
npm test          # Run full test suite
npm run lint      # Run linter
npm run typecheck # TypeScript type checking
```

All three must pass before a PR can be merged.

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

Use these prefixes:
- `feature/` — new features
- `fix/` — bug fixes
- `docs/` — documentation changes
- `refactor/` — code refactoring
- `test/` — test improvements

### 2. Make Changes

- Follow existing code style and conventions
- Add tests for new functionality
- Update documentation if needed
- Keep commits focused and descriptive

### 3. Commit

We use conventional commit messages:

```
type(scope): brief description

Optional longer description
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`

### 4. Push and Create a PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub:

- Reference any related issues
- Describe what changed and why
- Confirm tests pass locally

## Code Style

- **TypeScript** with strict type checking
- **React** functional components with hooks
- **i18n**: All user-facing strings must use the i18n system, never hardcoded
- **No Chinese text** in source files — English only in code, translations via i18n
- **Branding**: Always use "Lazynext" — never reference the original project name
- **Error handling**: Handle errors at appropriate boundaries, don't over-nest try/catch
- **Tests**: New features should include test coverage

## Pull Request Guidelines

- One feature/fix per PR
- PR title should follow conventional commit format
- All CI checks must pass
- Request review from maintainers
- Be responsive to feedback

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Search existing issues before creating a new one
- Include: OS, app version, steps to reproduce, expected vs actual behavior
- For security issues, see [SECURITY.md](SECURITY.md)

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
