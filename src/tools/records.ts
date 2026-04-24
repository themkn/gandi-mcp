import { z } from "zod";
import type { ToolContext, ToolDefinition } from "../server.js";
import { writeLocalBackup } from "../gandi/backup.js";
import type { DnsRecord } from "../gandi/types.js";

const DomainRef = z.string().min(1).optional();
const NameStr = z.string().min(1);
const TypeStr = z.string().min(1);
const ValuesArr = z.array(z.string().min(1)).min(1);
const TtlNum = z.number().int().positive().optional();
const TtlMutation = z.number().int().positive().default(300);

const ListInput = z
  .object({
    domain: DomainRef,
    type: z.string().min(1).optional(),
    nameFilter: z.string().min(1).optional(),
  })
  .strict();
const GetInput = z.object({ domain: DomainRef, name: NameStr, type: TypeStr }).strict();
const AddInput = z
  .object({ domain: DomainRef, name: NameStr, type: TypeStr, values: ValuesArr, ttl: TtlMutation })
  .strict();
const UpdateInput = z
  .object({ domain: DomainRef, name: NameStr, type: TypeStr, values: ValuesArr, ttl: TtlMutation })
  .strict();
const DeleteInput = z.object({ domain: DomainRef, name: NameStr, type: TypeStr }).strict();

function resolveDomain(input: { domain?: string }, ctx: ToolContext): string {
  const d = input.domain ?? ctx.config.defaultDomain;
  if (!d) {
    throw new Error(
      "No domain provided and no `defaultDomain` in config. Pass `domain` explicitly or set one in ~/.gandi-mcp/config.json.",
    );
  }
  return d;
}

function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i");
}

async function backupIfEnabled(ctx: ToolContext, domain: string): Promise<string | null> {
  if (!ctx.config.autoBackup) return null;
  const records = await ctx.client.listRecords(domain);
  return writeLocalBackup(domain, records, ctx.config.backupDir);
}

export const recordTools: ToolDefinition<unknown>[] = [
  {
    name: "list_records",
    description:
      "List DNS records for a domain. Optionally filter by `type` (A, CNAME, MX, TXT, ...) and `nameFilter` (anchored, case-insensitive glob: `*` = any chars, `?` = one char).",
    schema: ListInput,
    handler: async (input, ctx) => {
      const i = input as z.infer<typeof ListInput>;
      const domain = resolveDomain(i, ctx);
      let records: readonly DnsRecord[] = await ctx.client.listRecords(domain);
      if (i.type) {
        const t = i.type.toUpperCase();
        records = records.filter((r) => r.rrset_type.toUpperCase() === t);
      }
      if (i.nameFilter) {
        const re = globToRegex(i.nameFilter);
        records = records.filter((r) => re.test(r.rrset_name));
      }
      return records;
    },
  },
  {
    name: "get_record",
    description:
      "Fetch a single DNS record by name and type. Throws if no record with that name and type exists — use `list_records` first if you're unsure what exists.",
    schema: GetInput,
    handler: async (input, ctx) => {
      const i = input as z.infer<typeof GetInput>;
      return ctx.client.getRecord(resolveDomain(i, ctx), i.name, i.type);
    },
  },
  {
    name: "add_record",
    description:
      "Add a new DNS record. A local JSON backup of the full zone is written first (configurable). Verifies by re-fetching the record.",
    schema: AddInput,
    handler: async (input, ctx) => {
      const i = AddInput.parse(input);
      const domain = resolveDomain(i, ctx);
      const backup = await backupIfEnabled(ctx, domain);
      await ctx.client.addRecord(domain, {
        name: i.name,
        type: i.type,
        values: i.values,
        ttl: i.ttl,
      });
      const record: DnsRecord = await ctx.client.getRecord(domain, i.name, i.type);
      return { backup, record };
    },
  },
  {
    name: "update_record",
    description:
      "Replace values and/or TTL for an existing record. A local JSON backup of the full zone is written first (configurable). Verifies by re-fetching.",
    schema: UpdateInput,
    handler: async (input, ctx) => {
      const i = UpdateInput.parse(input);
      const domain = resolveDomain(i, ctx);
      const backup = await backupIfEnabled(ctx, domain);
      await ctx.client.updateRecord(domain, {
        name: i.name,
        type: i.type,
        values: i.values,
        ttl: i.ttl,
      });
      const record: DnsRecord = await ctx.client.getRecord(domain, i.name, i.type);
      return { backup, record };
    },
  },
  {
    name: "delete_record",
    description:
      "Delete a DNS record. Irreversible. A local JSON backup of the full zone is written first (configurable).",
    schema: DeleteInput,
    handler: async (input, ctx) => {
      const i = input as z.infer<typeof DeleteInput>;
      const domain = resolveDomain(i, ctx);
      const backup = await backupIfEnabled(ctx, domain);
      await ctx.client.deleteRecord(domain, i.name, i.type);
      return { backup, deleted: { name: i.name, type: i.type } };
    },
  },
];
