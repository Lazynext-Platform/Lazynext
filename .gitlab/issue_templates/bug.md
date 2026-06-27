# Bug: {Title}

<!--
  Lazynext Bug Report Template
  Please provide as much detail as possible so we can reproduce and fix
  the issue quickly.
-->

## Summary

<!-- Clear, concise description of the bug. -->

## Severity

<!-- Choose one -->

- [ ] **Critical** — crash, data loss, security vulnerability, production outage
- [ ] **High** — core feature broken, no workaround
- [ ] **Medium** — feature partially broken, workaround exists
- [ ] **Low** — cosmetic, minor annoyance

## Environment

### Platform

<!-- Check all where the bug reproduces -->

- [ ] Web (browser)
- [ ] Desktop (GPUI)
- [ ] Mobile (React Native)
- [ ] Browser Extension
- [ ] API Gateway (port 8005)
- [ ] MCP Server
- [ ] CLI

### Browser (if web)

- [ ] Chrome / Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

Version: {browser version}

### OS

- [ ] macOS {version}
- [ ] Windows {version}
- [ ] Linux {distro + version}

### App Version

<!-- e.g. git commit hash, tag, or release version -->

Commit: `{git rev-parse HEAD}`
Tag: `{git describe --tags}`

### Deployment Type

- [ ] Local development (`bun run dev`)
- [ ] Docker Compose (`docker compose up`)
- [ ] Staging (`staging.lazynext.app`)
- [ ] Production (`lazynext.app`)

## Reproduction Steps

<!--
  Numbered steps to reproduce.  Be specific: which buttons,
  which menu items, what data is in the timeline/project.
-->

1.
2.
3.

### Expected Behavior

<!-- What did you expect to happen? -->

### Actual Behavior

<!-- What actually happened?  Include exact error messages and stack traces. -->

```
{Paste error / stack trace here}
```

## Media Assets

<!--
  If applicable, attach:
  - Screenshots of the bug
  - Screen recording of the reproduction
  - The .lazynext project file that triggers the bug
  - Console / network logs
-->

## Impact

<!-- Who is affected?  How many users?  Is there a workaround? -->

## Possible Root Cause

<!-- Optional: if you have a theory about what caused this -->

{Your analysis here}

---

/label ~bug ~"needs triage"
