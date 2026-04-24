import { describe, it, expect, vi } from "vitest";
import { domainTools } from "../../src/tools/domains.js";
import type { ToolContext } from "../../src/server.js";

const tool = domainTools.find((t) => t.name === "list_domains")!;

function ctx(overrides: Partial<ToolContext["client"]> = {}): ToolContext {
  return {
    client: { listDomains: vi.fn().mockResolvedValue([{ fqdn: "ex.com" }]), ...overrides } as never,
    config: { apiKey: "K", autoBackup: true, backupDir: "/tmp" } as never,
  };
}

describe("list_domains", () => {
  it("returns the domain list from the client", async () => {
    const result = await tool.handler({}, ctx());
    expect(result).toEqual([{ fqdn: "ex.com" }]);
  });
});
