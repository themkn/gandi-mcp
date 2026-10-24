# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.7] - 2026-10-24

### Fixed

- Report the real package version in the MCP `serverInfo` handshake. It was hard-coded to 1.1.2 in `server.ts` and had drifted from `package.json`; it is now read from `package.json` at startup.

### Security

- Require Node.js 24.22.1 or newer for local development (`.tool-versions`) and recommend it in the README. Earlier Node 24.x builds still trust the eight compromised eMudhra intermediate CA certificates (October 2026), which lets an attacker forge the TLS certificate of `api.gandi.net` for the bundled `fetch` client. Node 24.22.1 ships the NSS 3.131.1 root store that rejects them. No code change was needed; the fix is in the runtime.

### Changed

- Bump `vitest` from 4.1.11 to 5.0.5 (#47)
- Bump `github/codeql-action` from 4.38.3 to 4.39.0 (#48)

## [1.1.6] - 2026-10-16

### Security

- Bump `@modelcontextprotocol/sdk` from 1.30.0 to 1.32.1, fixing the OAuth client sending credentials to an authorization server chosen by the MCP server (#39, #41)
- Refresh transitive dependencies to patched versions: `proxy-addr` 2.0.7 to 2.0.8 (IP spoofing via IPv4-mapped IPv6 trust subnet), `fast-uri` 3.1.5 to 3.1.8 (SSRF and host confusion via hostname normalization), `qs` 6.15.3 to 6.16.0 (DoS via attacker-controlled `isBuffer`, array-limit bypass), `ip-address` 10.4.0 to 10.7.4 (SSRF and trust-boundary bypass in subnet checks), `hono` 4.12.34 to 4.13.13 (jsx XSS, `parseBody()` memory exhaustion, `toSSG()` path traversal), `nanoid` to 3.3.20, `source-map-js` 1.2.1 to 1.2.2 (event-loop DoS)
- Bump `vitest` and `@vitest/mocker` from 4.1.10 to 4.1.11, fixing path traversal via redirect mock (#37)

### Changed

- Bump `zod` from 4.4.3 to 4.6.7 (#39)
- Bump `@types/node` from 26.1.2 to 26.6.5 (#36)
- Bump `vite` from 8.2.0 to 8.3.4 (#36)
- Bump GitHub Actions CI dependencies (#40)
- Publish to npm via OIDC trusted publishing on tag push; releases now carry npm provenance

### Fixed

- Remove the obsolete `hono` entry from `pnpm.overrides`. Dependabot regenerates the lockfile without the overrides section, which made every dependency PR fail `--frozen-lockfile` installs in CI. `hono` now resolves to 4.13.x on its own.

## [1.1.5] - 2026-08-19

### Changed

- Bump `@modelcontextprotocol/sdk` from 1.29.0 to 1.30.0 (#30)
- Bump `typescript` from 6.0.3 to 7.0.2 (#29)
- Bump `@types/node` from 25.9.2 to 26.1.2 (#24, #31)
- Bump `vite` from 8.1.0 to 8.2.0 (#25, #31)
- Bump `vitest` from 4.1.9 to 4.1.10 (#25)
- Bump GitHub Actions CI dependencies (#26, #32)

### Fixed

- Remove redundant `vite` entry from `pnpm.overrides` that broke `--frozen-lockfile` installs in CI

## [1.1.4] - 2026-06-29

### Security

- Patch transitive `hono` vulnerability: pin to >=4.12.25 (CORS credential reflection, body-limit bypass, header-deduplication, path traversal, cookie-merging) via `pnpm.overrides`
- Patch transitive `vite` vulnerability: pin to >=8.0.16 (Windows `server.fs.deny` bypass, NTLMv2 hash disclosure) — resolved to 8.1.0 via explicit devDep

### Changed

- Bump `vitest` from 4.1.7 to 4.1.9 (#16, #21)
- Bump `@types/node` from 25.9.1 to 25.9.2 (#18)
- Bump GitHub Actions CI dependencies (#17, #20)
