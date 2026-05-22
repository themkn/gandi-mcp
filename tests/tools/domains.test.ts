import { describe, it, expect, vi } from "vitest";
import { domainTools } from "../../src/tools/domains.js";
import { GandiError } from "../../src/gandi/errors.js";
import type { ToolContext } from "../../src/server.js";

const tool = domainTools.find((t) => t.name === "list_domains")!;

function ctx(overrides: Partial<ToolContext["client"]> = {}): ToolContext {
  return {
    client: {
      listDomains: vi.fn().mockResolvedValue([]),
      listOrganizations: vi.fn().mockResolvedValue([]),
      ...overrides,
    } as never,
    defaultDomain: undefined,
    autoBackup: true,
    backupDir: "/tmp",
  };
}

describe("list_domains", () => {
  it("unions personal + every organization's domains, deduped by fqdn", async () => {
    const listDomains = vi.fn(async (sharingId?: string) => {
      if (!sharingId) return [{ fqdn: "personal.com" }];
      if (sharingId === "org-1") return [{ fqdn: "shared.com" }, { fqdn: "personal.com" }];
      if (sharingId === "org-2") return [{ fqdn: "client.com" }];
      return [];
    });
    const listOrganizations = vi.fn().mockResolvedValue([
      { id: "org-1", name: "JLS" },
      { id: "org-2", name: "Client" },
    ]);

    const result = await tool.handler({}, ctx({ listDomains, listOrganizations }));
    expect(result).toEqual([
      { fqdn: "personal.com" },
      { fqdn: "shared.com" },
      { fqdn: "client.com" },
    ]);
    expect(listOrganizations).toHaveBeenCalledOnce();
    expect(listDomains).toHaveBeenCalledTimes(3);
  });

  it("uses the explicit sharing_id when provided and skips org discovery", async () => {
    const listDomains = vi.fn().mockResolvedValue([{ fqdn: "scoped.com" }]);
    const listOrganizations = vi.fn();

    const result = await tool.handler(
      { sharing_id: "org-1" },
      ctx({ listDomains, listOrganizations }),
    );
    expect(result).toEqual([{ fqdn: "scoped.com" }]);
    expect(listDomains).toHaveBeenCalledWith("org-1");
    expect(listOrganizations).not.toHaveBeenCalled();
  });

  it("falls back to personal-only when org listing is forbidden", async () => {
    const listDomains = vi.fn().mockResolvedValue([{ fqdn: "personal.com" }]);
    const listOrganizations = vi.fn().mockRejectedValue(new GandiError(403, "forbidden"));

    const result = await tool.handler({}, ctx({ listDomains, listOrganizations }));
    expect(result).toEqual([{ fqdn: "personal.com" }]);
    expect(listDomains).toHaveBeenCalledOnce();
  });

  it("skips orgs that return 403 on listDomains but keeps the others", async () => {
    const listDomains = vi.fn(async (sharingId?: string) => {
      if (!sharingId) return [];
      if (sharingId === "org-allowed") return [{ fqdn: "ok.com" }];
      if (sharingId === "org-denied") throw new GandiError(403, "forbidden");
      return [];
    });
    const listOrganizations = vi.fn().mockResolvedValue([
      { id: "org-allowed", name: "OK" },
      { id: "org-denied", name: "No" },
    ]);

    const result = await tool.handler({}, ctx({ listDomains, listOrganizations }));
    expect(result).toEqual([{ fqdn: "ok.com" }]);
  });

  it("propagates non-permission errors from org listing", async () => {
    const listDomains = vi.fn().mockResolvedValue([]);
    const listOrganizations = vi.fn().mockRejectedValue(new GandiError(500, "boom"));

    await expect(
      tool.handler({}, ctx({ listDomains, listOrganizations })),
    ).rejects.toMatchObject({ status: 500 });
  });
});
