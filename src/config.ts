import { closeSync, fstatSync, openSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

export const DEFAULT_CONFIG_PATH = join(homedir(), ".gandi-mcp", "config.json");

const ConfigSchema = z.object({
  apiKey: z.string().min(1, "apiKey must be a non-empty string"),
  defaultDomain: z.string().min(1).optional(),
  autoBackup: z.boolean().default(true),
  backupDir: z.string().min(1).default(join(homedir(), ".gandi-mcp", "backups")),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(path: string = DEFAULT_CONFIG_PATH): Config {
  let fd: number;
  try {
    fd = openSync(path, "r");
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Config not found at ${path}. Create it with mode 0600, e.g.\n` +
          `  mkdir -p ~/.gandi-mcp && chmod 700 ~/.gandi-mcp\n` +
          `  echo '{"apiKey":"...","defaultDomain":"example.com"}' > ${path}\n` +
          `  chmod 600 ${path}`,
      );
    }
    throw err;
  }

  // Check perms and read from the same open fd so the inode can't be swapped between checks.
  let raw: string;
  try {
    const stat = fstatSync(fd);
    if ((stat.mode & 0o077) !== 0) {
      const current = (stat.mode & 0o777).toString(8);
      throw new Error(
        `Config file ${path} has insecure permission ${current}. Run: chmod 600 ${path}`,
      );
    }
    try {
      raw = readFileSync(fd, "utf8");
    } catch (err) {
      throw new Error(`Unable to read ${path}: ${(err as Error).message}`);
    }
  } finally {
    closeSync(fd);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse ${path}: ${(err as Error).message}`);
  }

  const result = ConfigSchema.safeParse(parsed);
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid config (${path}): ${msg}`);
  }
  return result.data;
}
