import { createRequire } from "node:module";

// Resolved relative to this file, so it works both from src/ (vitest) and
// from dist/ (published build): ../package.json is the package root either way.
const pkg = createRequire(import.meta.url)("../package.json") as { version: string };

export const PACKAGE_VERSION: string = pkg.version;
