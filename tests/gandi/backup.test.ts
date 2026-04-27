import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, statSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeLocalBackup } from "../../src/gandi/backup.js";
import type { DnsRecord } from "../../src/gandi/types.js";

// Allow tests to override homedir() without touching the real home directory
vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>();
  return {
    ...actual,
    homedir: vi.fn(() => actual.homedir()),
  };
});

const sampleRecords: DnsRecord[] = [
  { rrset_name: "www", rrset_type: "A", rrset_values: ["1.2.3.4"], rrset_ttl: 300 },
];

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "gandi-mcp-bk-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("writeLocalBackup", () => {
  it("writes a file named {domain}-{isoSanitized}.json", async () => {
    const path = await writeLocalBackup("jls.digital", sampleRecords, dir);
    expect(path).toMatch(/jls\.digital-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/);
  });

  it("writes mode 0600", async () => {
    const path = await writeLocalBackup("ex.com", sampleRecords, dir);
    const mode = statSync(path).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("creates the dir with 0700 if missing", async () => {
    const nested = join(dir, "nested", "inner");
    const path = await writeLocalBackup("ex.com", sampleRecords, nested);
    expect(path.startsWith(nested)).toBe(true);
    const mode = statSync(nested).mode & 0o777;
    expect(mode).toBe(0o700);
  });

  it("writes the CLI-compatible JSON shape", async () => {
    const path = await writeLocalBackup("ex.com", sampleRecords, dir);
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    expect(parsed.domain).toBe("ex.com");
    expect(typeof parsed.date).toBe("string");
    expect(parsed.records).toEqual(sampleRecords);
  });

  it("expands leading ~ in dir", async () => {
    // Point homedir() at our isolated tmp dir, so `~/sub` resolves under `dir`
    const os = await import("node:os");
    const homedirMock = vi.mocked(os.homedir);
    homedirMock.mockReturnValue(dir);
    try {
      const abs = await writeLocalBackup("ex.com", sampleRecords, "~/sub");
      expect(abs.startsWith(dir)).toBe(true);
    } finally {
      homedirMock.mockRestore();
    }
  });

  it("throws if write fails (dir is not writable)", async () => {
    const readonly = join(dir, "ro");
    const { mkdirSync, chmodSync } = await import("node:fs");
    mkdirSync(readonly);
    chmodSync(readonly, 0o500);
    await expect(writeLocalBackup("ex.com", sampleRecords, readonly)).rejects.toThrow();
    chmodSync(readonly, 0o700);
  });

  it.each([
    ["../etc/passwd"],
    ["..\\foo"],
    ["foo/bar"],
    ["foo\\bar"],
    [".."],
    ["."],
    ["evil\0.com"],
  ])("rejects path-traversal-shaped domain %j", async (badDomain) => {
    await expect(writeLocalBackup(badDomain, sampleRecords, dir)).rejects.toThrow(
      /invalid domain/i,
    );
  });
});
