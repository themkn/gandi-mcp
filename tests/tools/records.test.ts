import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordTools } from "../../src/tools/records.js";
import type { ToolContext } from "../../src/server.js";
import type { DnsRecord } from "../../src/gandi/types.js";

const sample: DnsRecord[] = [
  { rrset_name: "www", rrset_type: "A", rrset_values: ["1.2.3.4"], rrset_ttl: 300 },
  { rrset_name: "api", rrset_type: "A", rrset_values: ["5.6.7.8"], rrset_ttl: 300 },
  { rrset_name: "app-staging", rrset_type: "CNAME", rrset_values: ["target."], rrset_ttl: 300 },
];

const findTool = (name: string) => {
  const t = recordTools.find((x) => x.name === name);
  if (!t) throw new Error(`tool ${name} missing`);
  return t;
};

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "gandi-mcp-r-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function makeCtx(
  client: Partial<ToolContext["client"]> = {},
  cfg: Partial<ToolContext["config"]> = {},
): ToolContext {
  return {
    client: {
      listRecords: vi.fn().mockResolvedValue(sample),
      getRecord: vi.fn(),
      addRecord: vi.fn().mockResolvedValue(undefined),
      updateRecord: vi.fn().mockResolvedValue(undefined),
      deleteRecord: vi.fn().mockResolvedValue(undefined),
      ...client,
    } as never,
    config: {
      apiKey: "K",
      defaultDomain: "ex.com",
      autoBackup: true,
      backupDir: dir,
      ...cfg,
    } as never,
  };
}

describe("list_records", () => {
  const t = findTool("list_records");

  it("returns all records when no filters", async () => {
    const out = (await t.handler({}, makeCtx())) as DnsRecord[];
    expect(out).toHaveLength(3);
  });

  it("filters by type (case-insensitive)", async () => {
    const out = (await t.handler({ type: "a" }, makeCtx())) as DnsRecord[];
    expect(out).toHaveLength(2);
    expect(out.every((r) => r.rrset_type === "A")).toBe(true);
  });

  it("filters by name glob (`*` matches any)", async () => {
    const out = (await t.handler({ nameFilter: "app-*" }, makeCtx())) as DnsRecord[];
    expect(out).toHaveLength(1);
    expect(out[0]!.rrset_name).toBe("app-staging");
  });

  it("uses defaultDomain when domain omitted", async () => {
    const listRecords = vi.fn().mockResolvedValue(sample);
    await t.handler({}, makeCtx({ listRecords }));
    expect(listRecords).toHaveBeenCalledWith("ex.com");
  });

  it("errors when no domain available", async () => {
    await expect(
      t.handler({}, makeCtx({}, { defaultDomain: undefined })),
    ).rejects.toThrow(/domain/);
  });
});

describe("get_record", () => {
  const t = findTool("get_record");

  it("returns the single record from the client", async () => {
    const getRecord = vi.fn().mockResolvedValue(sample[0]);
    const out = await t.handler({ name: "www", type: "A" }, makeCtx({ getRecord }));
    expect(getRecord).toHaveBeenCalledWith("ex.com", "www", "A");
    expect(out).toEqual(sample[0]);
  });
});

describe("add_record mutation contract", () => {
  const t = findTool("add_record");

  it("lists → backs up → adds → verifies, in order", async () => {
    const listRecords = vi.fn().mockResolvedValue(sample);
    const addRecord = vi.fn().mockResolvedValue(undefined);
    const verified: DnsRecord = { rrset_name: "new", rrset_type: "A", rrset_values: ["9.9.9.9"], rrset_ttl: 300 };
    const getRecord = vi.fn().mockResolvedValue(verified);

    const ctx = makeCtx({ listRecords, addRecord, getRecord });
    const result = (await t.handler(
      { name: "new", type: "A", values: ["9.9.9.9"] },
      ctx,
    )) as { backup: string | null; record: DnsRecord };

    expect(listRecords).toHaveBeenCalledBefore(addRecord as never);
    expect(addRecord).toHaveBeenCalledBefore(getRecord as never);
    expect(result.record).toEqual(verified);
    expect(result.backup).toMatch(/ex\.com-/);
  });

  it("skips backup when autoBackup:false", async () => {
    const listRecords = vi.fn().mockResolvedValue(sample);
    const addRecord = vi.fn().mockResolvedValue(undefined);
    const getRecord = vi.fn().mockResolvedValue(sample[0]);
    const ctx = makeCtx({ listRecords, addRecord, getRecord }, { autoBackup: false });
    const result = (await t.handler(
      { name: "new", type: "A", values: ["9.9.9.9"] },
      ctx,
    )) as { backup: string | null };

    expect(listRecords).not.toHaveBeenCalled();
    expect(result.backup).toBeNull();
  });

  it("aborts when backup write fails", async () => {
    const listRecords = vi.fn().mockResolvedValue(sample);
    const addRecord = vi.fn();
    const ctx = makeCtx(
      { listRecords, addRecord },
      { backupDir: "/this/path/cannot/be/written/anywhere" },
    );
    await expect(
      t.handler({ name: "new", type: "A", values: ["9.9.9.9"] }, ctx),
    ).rejects.toThrow();
    expect(addRecord).not.toHaveBeenCalled();
  });

  it("defaults ttl to 300", async () => {
    const addRecord = vi.fn().mockResolvedValue(undefined);
    const getRecord = vi.fn().mockResolvedValue(sample[0]);
    const ctx = makeCtx({ addRecord, getRecord });
    await t.handler({ name: "new", type: "A", values: ["9.9.9.9"] }, ctx);
    expect(addRecord).toHaveBeenCalledWith("ex.com", expect.objectContaining({ ttl: 300 }));
  });
});

describe("update_record mutation contract", () => {
  const t = findTool("update_record");

  it("lists → backs up → updates → verifies", async () => {
    const listRecords = vi.fn().mockResolvedValue(sample);
    const updateRecord = vi.fn().mockResolvedValue(undefined);
    const verified: DnsRecord = { rrset_name: "www", rrset_type: "A", rrset_values: ["1.1.1.1"], rrset_ttl: 600 };
    const getRecord = vi.fn().mockResolvedValue(verified);

    const ctx = makeCtx({ listRecords, updateRecord, getRecord });
    const result = (await t.handler(
      { name: "www", type: "A", values: ["1.1.1.1"], ttl: 600 },
      ctx,
    )) as { record: DnsRecord };
    expect(listRecords).toHaveBeenCalledBefore(updateRecord as never);
    expect(updateRecord).toHaveBeenCalledBefore(getRecord as never);
    expect(result.record).toEqual(verified);
  });
});

describe("delete_record mutation contract", () => {
  const t = findTool("delete_record");

  it("lists → backs up → deletes → returns deleted descriptor", async () => {
    const listRecords = vi.fn().mockResolvedValue(sample);
    const deleteRecord = vi.fn().mockResolvedValue(undefined);
    const ctx = makeCtx({ listRecords, deleteRecord });
    const result = (await t.handler({ name: "www", type: "A" }, ctx)) as {
      backup: string | null;
      deleted: { name: string; type: string };
    };
    expect(listRecords).toHaveBeenCalledBefore(deleteRecord as never);
    expect(result.deleted).toEqual({ name: "www", type: "A" });
    expect(result.backup).toMatch(/ex\.com-/);
  });
});
