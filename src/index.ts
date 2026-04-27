#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { GandiClient } from "./gandi/client.js";
import { runServer, type ToolDefinition } from "./server.js";
import { domainTools } from "./tools/domains.js";
import { recordTools } from "./tools/records.js";
import { snapshotTools } from "./tools/snapshots.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new GandiClient(config.apiKey);

  const tools: ToolDefinition<unknown>[] = [
    ...domainTools,
    ...recordTools,
    ...snapshotTools,
  ];

  await runServer({ config, client, tools });
}

main().catch((err: Error) => {
  process.stderr.write(`gandi-mcp: ${err.message}\n`);
  process.exit(1);
});
