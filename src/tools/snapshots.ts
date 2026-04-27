import { z } from "zod";
import type { ToolContext, ToolDefinition } from "../server.js";

const DomainRef = z.string().min(1).optional();

const ListInput = z.object({ domain: DomainRef }).strict();
const CreateInput = z.object({ domain: DomainRef, name: z.string().min(1).optional() }).strict();

function resolveDomain(input: { domain?: string }, ctx: ToolContext): string {
  const d = input.domain ?? ctx.config.defaultDomain;
  if (!d) {
    throw new Error(
      "No domain provided and no `defaultDomain` in config. Pass `domain` explicitly or set one in ~/.gandi-mcp/config.json.",
    );
  }
  return d;
}

export const snapshotTools: ToolDefinition<unknown>[] = [
  {
    name: "list_snapshots",
    description: "List server-side zone snapshots Gandi has stored for a domain.",
    schema: ListInput,
    handler: async (input, ctx) => {
      const i = ListInput.parse(input);
      return ctx.client.listSnapshots(resolveDomain(i, ctx));
    },
  },
  {
    name: "create_snapshot",
    description:
      "Create a server-side zone snapshot on Gandi. Snapshots persist on Gandi's servers and can be reviewed via `list_snapshots`. Use this before risky changes you might want to roll back.",
    schema: CreateInput,
    handler: async (input, ctx) => {
      const i = CreateInput.parse(input);
      return ctx.client.createSnapshot(resolveDomain(i, ctx), i.name);
    },
  },
];
