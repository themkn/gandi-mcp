# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.4] - 2026-06-29

### Security

- Patch transitive `hono` vulnerability: pin to >=4.12.25 (CORS credential reflection, body-limit bypass, header-deduplication, path traversal, cookie-merging) via `pnpm.overrides`
- Patch transitive `vite` vulnerability: pin to >=8.0.16 (Windows `server.fs.deny` bypass, NTLMv2 hash disclosure) — resolved to 8.1.0 via explicit devDep

### Changed

- Bump `vitest` from 4.1.7 to 4.1.9 (#16, #21)
- Bump `@types/node` from 25.9.1 to 25.9.2 (#18)
- Bump GitHub Actions CI dependencies (#17, #20)
