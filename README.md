# gandi-mcp — Gandi LiveDNS MCP Server

[![npm](https://img.shields.io/npm/v/@themkn/gandi-mcp)](https://www.npmjs.com/package/@themkn/gandi-mcp)
[![license](https://img.shields.io/npm/l/@themkn/gandi-mcp)](./LICENSE)

An [MCP server](https://modelcontextprotocol.io) for [Gandi LiveDNS](https://api.gandi.net/docs/livedns/). Manage DNS records, list domains, and take zone snapshots — directly from [Claude Code](https://docs.anthropic.com/en/docs/claude-code) or any MCP-compatible client.

## What this gives you

- **8 MCP tools:** `list_domains`, `list_records`, `get_record`, `add_record`, `update_record`, `delete_record`, `list_snapshots`, `create_snapshot`
- **Safety by default:** every `add`/`update`/`delete` writes a timestamped local JSON backup of the full zone **before** mutating. Configurable.
- **One-JSON config:** no env vars, one file with strict `0600` perms

## Prerequisites

- **A Gandi account** with a [Personal Access Token](https://admin.gandi.net/) (*Account → Security → Personal Access Tokens*) with LiveDNS access
- **Node.js 24+**

## Install

```sh
npm install -g @themkn/gandi-mcp
```

The binary is `gandi-mcp` regardless of the scoped package name.

## Configure

The server reads a JSON config from `~/.gandi-mcp/config.json`. Create it with `0600`:

```sh
mkdir -p ~/.gandi-mcp
chmod 700 ~/.gandi-mcp
cat > ~/.gandi-mcp/config.json <<'EOF'
{
  "apiKey": "YOUR_GANDI_PAT",
  "defaultDomain": "example.com"
}
EOF
chmod 600 ~/.gandi-mcp/config.json
```

### Full config reference

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `apiKey` | yes | — | Your Gandi Personal Access Token |
| `defaultDomain` | no | none | Used when a tool call omits `domain` |
| `autoBackup` | no | `true` | Write local zone backup before each mutation |
| `backupDir` | no | `~/.gandi-mcp/backups` | Where backup files land |

The server refuses to start if the config file is group- or world-readable.

## Hook into Claude Code

Add this to your `.mcp.json` (project-scoped) or `~/.config/claude/mcp.json` (global):

```json
{
  "mcpServers": {
    "gandi": {
      "command": "gandi-mcp"
    }
  }
}
```

### Auto-approve tools

By default Claude Code prompts on every tool call. To allow all `gandi-mcp` tools without prompting, add to `~/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": ["mcp__gandi__*"]
  }
}
```

## Tool reference

| Tool | What it does |
|------|--------------|
| `list_domains` | List all domains on your Gandi account |
| `list_records` | List records for a domain, with optional `type` and `nameFilter` (anchored, case-insensitive glob — `*` = any, `?` = one) |
| `get_record` | Fetch a single record by name + type |
| `add_record` | Add a new record; auto-backup runs first |
| `update_record` | Replace values/TTL on an existing record; auto-backup runs first |
| `delete_record` | Delete a record; auto-backup runs first |
| `list_snapshots` | List Gandi server-side zone snapshots |
| `create_snapshot` | Create a server-side zone snapshot on Gandi |

Mutation tools return the local backup path in their response — reference it if you need to roll back manually.

## Backups

Each mutation writes `~/.gandi-mcp/backups/<domain>-<timestamp>.json`:

```json
{
  "domain": "example.com",
  "date": "2026-04-24T11:47:03.123Z",
  "records": [ /* full zone */ ]
}
```

Format matches the `gandi` CLI's backup shape. Disable via `"autoBackup": false` in config.

## Development

```sh
git clone git@github.com:themkn/gandi-mcp.git
cd gandi-mcp
pnpm install
pnpm test
pnpm build
```

## License

MIT
