import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "gandi-mcp-cfg-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function writeConfig(contents: string, mode = 0o600) {
  const p = join(dir, "config.json");
  writeFileSync(p, contents);
  chmodSync(p, mode);
  return p;
}

describe("loadConfig", () => {
  it("loads a valid config", () => {
    const p = writeConfig(JSON.stringify({ apiKey: "K", defaultDomain: "ex.com" }));
    const cfg = loadConfig(p);
    expect(cfg.apiKey).toBe("K");
    expect(cfg.defaultDomain).toBe("ex.com");
    expect(cfg.autoBackup).toBe(true);
    expect(cfg.backupDir).toContain(".gandi-mcp/backups");
  });

  it("accepts an explicit autoBackup:false", () => {
    const p = writeConfig(JSON.stringify({ apiKey: "K", autoBackup: false }));
    const cfg = loadConfig(p);
    expect(cfg.autoBackup).toBe(false);
  });

  it("accepts an explicit backupDir", () => {
    const p = writeConfig(
      JSON.stringify({ apiKey: "K", backupDir: "/var/backups/gandi" }),
    );
    const cfg = loadConfig(p);
    expect(cfg.backupDir).toBe("/var/backups/gandi");
  });

  it("rejects missing file with an actionable message", () => {
    expect(() => loadConfig(join(dir, "missing.json"))).toThrow(/Config not found/);
  });

  it("rejects group-readable perms", () => {
    const p = writeConfig(JSON.stringify({ apiKey: "K" }), 0o640);
    expect(() => loadConfig(p)).toThrow(/insecure permission/);
  });

  it("rejects world-readable perms", () => {
    const p = writeConfig(JSON.stringify({ apiKey: "K" }), 0o604);
    expect(() => loadConfig(p)).toThrow(/insecure permission/);
  });

  it("rejects malformed JSON", () => {
    const p = writeConfig("{ not json");
    expect(() => loadConfig(p)).toThrow(/Failed to parse/);
  });

  it("rejects missing apiKey", () => {
    const p = writeConfig(JSON.stringify({ defaultDomain: "ex.com" }));
    expect(() => loadConfig(p)).toThrow(/apiKey/);
  });
});
