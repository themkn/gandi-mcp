import { mkdir, writeFile, chmod } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { DnsRecord } from "./types.js";

function expandTilde(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

export async function writeLocalBackup(
  domain: string,
  records: readonly DnsRecord[],
  dir: string,
): Promise<string> {
  const resolvedDir = expandTilde(dir);
  await mkdir(resolvedDir, { recursive: true, mode: 0o700 });

  const iso = new Date().toISOString(); // 2026-04-24T11:47:03.123Z
  const safeIso = iso.replace(/[:.]/g, "-");
  const filename = `${domain}-${safeIso}.json`;
  const fullPath = join(resolvedDir, filename);

  const payload = {
    domain,
    date: iso,
    records,
  };

  await writeFile(fullPath, JSON.stringify(payload, null, 2), { mode: 0o600 });
  await chmod(fullPath, 0o600);

  return fullPath;
}
