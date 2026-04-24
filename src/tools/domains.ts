import { z } from "zod";
import type { ToolDefinition } from "../server.js";

const ListDomainsInput = z.object({}).strict();

export const domainTools: ToolDefinition<unknown>[] = [
  {
    name: "list_domains",
    description: "List all domains on this Gandi account.",
    schema: ListDomainsInput,
    handler: async (_input, ctx) => {
      return ctx.client.listDomains();
    },
  },
];
