import { z } from "zod";
import type { ToolDefinition } from "../server.js";
import { GandiError } from "../gandi/errors.js";
import type { Domain, Organization } from "../gandi/types.js";

const ListDomainsInput = z
  .object({
    sharing_id: z.string().min(1).optional(),
  })
  .strict();

export const domainTools: ToolDefinition<unknown>[] = [
  {
    name: "list_domains",
    description:
      "List all LiveDNS-managed domains the authenticated user can see, including domains owned by any organization the user belongs to. Without `sharing_id`, results are the union of the personal organization and every reachable organization. Pass `sharing_id` to scope to one organization.",
    schema: ListDomainsInput,
    handler: async (input, ctx) => {
      const parsed = input as z.infer<typeof ListDomainsInput>;

      if (parsed.sharing_id) {
        return ctx.client.listDomains(parsed.sharing_id);
      }

      const personalDomains = await ctx.client.listDomains();

      let orgs: Organization[];
      try {
        orgs = await ctx.client.listOrganizations();
      } catch (err) {
        if (err instanceof GandiError && (err.status === 403 || err.status === 404)) {
          return personalDomains;
        }
        throw err;
      }

      const orgResults = await Promise.all(
        orgs.map((org) =>
          ctx.client.listDomains(org.id).catch((err: unknown) => {
            if (err instanceof GandiError && (err.status === 403 || err.status === 404)) {
              return [] as Domain[];
            }
            throw err;
          }),
        ),
      );

      const seen = new Set<string>();
      const merged: Domain[] = [];
      for (const list of [personalDomains, ...orgResults]) {
        for (const d of list) {
          if (!seen.has(d.fqdn)) {
            seen.add(d.fqdn);
            merged.push(d);
          }
        }
      }
      return merged;
    },
  },
];
