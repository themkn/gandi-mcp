import { describe, it, expect, vi } from "vitest";
import { snapshotTools } from "../../src/tools/snapshots.js";
import type { ToolContext } from "../../src/server.js";

const findTool = (name: string) => snapshotTools.find((t) => t.name === name)!;

function ctx(client: Partial<ToolContext["client"]>): ToolContext {
  return {
    client: { listSnapshots: vi.fn(), createSnapshot: vi.fn(), ...client } as never,
    config: { apiKey: "K", defaultDomain: "ex.com", autoBackup: true, backupDir: "/tmp" } as never,
  };
}

describe("list_snapshots", () => {
  it("uses defaultDomain when domain omitted", async () => {
    const listSnapshots = vi.fn().mockResolvedValue([{ id: "a", created_at: "x" }]);
    const out = await findTool("list_snapshots").handler({}, ctx({ listSnapshots }));
    expect(listSnapshots).toHaveBeenCalledWith("ex.com");
    expect(out).toEqual([{ id: "a", created_at: "x" }]);
  });
});

describe("create_snapshot", () => {
  it("passes name through to client", async () => {
    const createSnapshot = vi.fn().mockResolvedValue({ id: "a", created_at: "x", name: "pre" });
    await findTool("create_snapshot").handler({ name: "pre" }, ctx({ createSnapshot }));
    expect(createSnapshot).toHaveBeenCalledWith("ex.com", "pre");
  });

  it("passes undefined when name omitted", async () => {
    const createSnapshot = vi.fn().mockResolvedValue({ id: "a", created_at: "x" });
    await findTool("create_snapshot").handler({}, ctx({ createSnapshot }));
    expect(createSnapshot).toHaveBeenCalledWith("ex.com", undefined);
  });
});
