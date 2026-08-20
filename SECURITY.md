# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.4.x   | :white_check_mark: |
| < 0.4   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Lazynext, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email **support@lazynext.com** with:

1. A description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if any)

### Response Timeline

- **Acknowledgement**: Within 48 hours
- **Initial assessment**: Within 5 business days
- **Fix or mitigation**: Depends on severity, typically within 30 days for high-severity issues

### Disclosure Policy

- We follow responsible disclosure
- We will credit reporters in release notes (unless you prefer to remain anonymous)
- Please do not publicly disclose the vulnerability until a fix has been released

## Security Measures

Lazynext is a local-first application:

- **API keys** are stored locally on the user's machine, never transmitted to third-party servers
- **Vertex AI authentication** uses Application Default Credentials (ADC), not plaintext keys
- **Project data** stays on the user's local filesystem
- **No telemetry or analytics** are collected by default
- **Desktop app** runs locally with no required cloud connection (except for AI provider calls the user configures)
