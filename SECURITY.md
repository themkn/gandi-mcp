# Security Policy

## Supported Versions

`@themkn/gandi-mcp` is in early development. Only the latest published `0.1.x` release receives security fixes.

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅        |
| < 0.1   | ❌        |

## Reporting a Vulnerability

**Please do not open a public issue for security vulnerabilities.**

Use GitHub's private vulnerability reporting:

1. Go to the [Security tab](https://github.com/themkn/gandi-mcp/security) of this repo.
2. Click **Report a vulnerability**.
3. Fill in the form. Include:
   - Affected version(s)
   - Reproduction steps
   - Impact (what an attacker could achieve)
   - Suggested fix, if you have one

You can also email the maintainer directly at `khoa@khoa.ch` with a clear subject like `[gandi-mcp security]`.

## What to Expect

- Acknowledgement within **3 working days**.
- Triage and severity assessment within **7 working days**.
- A patched release before public disclosure for confirmed vulnerabilities.
- Credit in the release notes if you'd like.

## Scope

In scope:

- The `@themkn/gandi-mcp` npm package and the source in this repo
- Authentication, authorization, input validation, file system access, and outbound HTTP behavior of the server

Out of scope:

- Vulnerabilities in dependencies that are already publicly tracked (please report those upstream — Dependabot handles them here)
- Issues in Gandi's LiveDNS API itself (report those to [Gandi](https://www.gandi.net/))
- Issues that require physical access to the user's machine
