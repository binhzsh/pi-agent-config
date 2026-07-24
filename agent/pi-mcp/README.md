# pi-mcp

> Pi extension for connecting MCP (Model Context Protocol) HTTP servers

[![npm version](https://badge.fury.io/js/%40eliemessiecode%2Fpi-mcp.svg)](https://www.npmjs.com/package/@eliemessiecode/pi-mcp)
[![Downloads](https://img.shields.io/npm/dm/@eliemessiecode/pi-mcp.svg)](https://www.npmjs.com/package/@eliemessiecode/pi-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- Connect to MCP servers via HTTP/SSE or Streamable HTTP
- Auto-discover tools available on servers
- Register MCP tools as native Pi tools
- Manage connections via slash commands
- Persistent configuration across sessions
- Global and per-project server configurations

## Installation

### Via npm (recommended)
```bash
npm install -g @eliemessiecode/pi-mcp
```

### Via bun
```bash
bun install -g @eliemessiecode/pi-mcp
```

### Via Pi
```bash
pi install npm:@eliemessiecode/pi-mcp
```

### Via Git
```bash
pi install git:github.com/ElieMessieCode/pi-mcp
```

### Manual
Copy the `pi-mcp` folder to:
- `~/.pi/agent/extensions/pi-mcp/` (global - all projects)
- `.pi/extensions/pi-mcp/` (project-local)

## Usage

### Commands

| Command | Description |
|---------|-------------|
| `/mcp add <name> <url> [options]` | Add server (options: `--global`, `--project`, `--insecure`, `--timeout`) |
| `/mcp remove <name>` | Remove a server |
| `/mcp list` | List configured servers (grouped by scope) |
| `/mcp connect [name]` | Connect to server(s) - all if no name |
| `/mcp disconnect [name]` | Disconnect from server(s) - all if no name |
| `/mcp tools [name]` | List available tools |
| `/mcp resources [name]` | List available resources |
| `/mcp prompts [name]` | List available prompts |
| `/mcp status` | Show connection status |
| `/mcp refresh [name]` | Refresh tool list |
| `/mcp scopes` | Show config file paths |
| `/mcp move <name> --global\|--project` | Move server between scopes |
| `/mcp export [file]` | Export servers to JSON |
| `/mcp import <file>` | Import servers from JSON |
| `/mcp-status` | Quick status overview |
| `/mcp-logs` | View debug logs |
| `/mcp-logs clear` | Clear debug logs |

### Examples

Add an MCP server (global):
```
/mcp add my-server https://my-mcp-server.com/mcp
```

Add a server for current project only:
```
/mcp add unity http://localhost:53559 --project
```

Add server with authentication:
```
/mcp add github https://api.github.com/mcp Authorization=Bearer ghp_xxx
```

Connect to all servers:
```
/mcp connect
```

Use an MCP tool (auto-registered):
```
Tools are automatically registered with the prefix: mcp_<server-name>_<tool-name>
```

## Supported Protocols

- **Streamable HTTP** (recommended): JSON-RPC with SSE support
- **SSE**: Server-Sent Events for notifications
- **Simple HTTP**: Request-response JSON-RPC

## Supported Data Types

MCP tools are automatically converted to Pi tools with:
- JSON Schema to TypeBox parameter conversion
- Supported types: `string`, `number`, `integer`, `boolean`, `array`, `object`
- Automatic description and documentation

## Configuration Scopes

| Scope | Path | Usage |
|-------|------|-------|
| Global | `~/.pi/agent/mcp/servers.json` | Shared across all projects |
| Project | `.pi/mcp/servers.json` | Specific to current project |

Servers auto-connect on Pi startup.

## Project Structure

```
pi-mcp/
├── index.ts           # Main extension
├── package.json       # Package metadata
├── README.md          # This documentation
├── LICENSE            # MIT license
├── CHANGELOG.md       # Version history
└── CONTRIBUTING.md    # Contribution guidelines
```

## Compatible MCP Server Example

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({
  name: "example-server",
  version: "1.0.0",
});

server.tool("get_weather", 
  { city: { type: "string", description: "City name" } },
  async ({ city }) => ({
    content: [{ type: "text", text: `Weather in ${city}: Sunny, 22C` }]
  })
);

server.start(3000);
```

## Troubleshooting

**Connection failed:**
- Verify the URL is accessible
- Check authentication headers
- Use `/mcp status` to see errors

**Tools not detected:**
- Use `/mcp refresh <name>` to refresh
- Verify the server implements `tools/list`
- Check Docker logs if using Docker: `docker logs <container-name>`

**Request timeout:**
- Default timeout: 30 seconds
- Check network latency

**Pi shows 0 tools:**
- Ensure Unity Editor is running (for Unity MCP)
- Check the MCP plugin is connected in Unity
- View logs: `/mcp-logs`

## Roadmap

### High Priority
- [x] Auto-reconnect when server drops
- [x] Periodic health check for server connections
- [x] Tool cleanup when server disconnects

### Medium Priority
- [x] MCP Resources support (`/mcp resources`)
- [x] MCP Prompts support (`/mcp prompts`)
- [x] TLS/SSL skip option (`--insecure`)
- [x] Configurable timeout per server (`--timeout <ms>`)
- [x] Move server between scopes (`/mcp move <name> --global|--project`)
- [x] Export/Import server configuration

### Low Priority
- [ ] Server groups (`/mcp group add <name> <server1> <server2>`)
- [ ] Tool filters (`/mcp add x --filter="assets-*"`)
- [ ] Connection history
- [ ] Usage metrics
- [ ] Custom tool templates

### Known Bugs
- [ ] Handle special characters in URLs
- [ ] More explicit timeout error messages
- [ ] Support Basic authentication

## Contributing

Contributions are welcome!

1. Fork the repo
2. Create a branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT - see [LICENSE](LICENSE) for details

---

## What's New in v1.2.0

- Auto-reconnect when server drops (up to 3 attempts)
- Periodic health check for server connections (30s interval)
- Automatic tool cleanup when server disconnects
- MCP Resources support
- MCP Prompts support
- TLS/SSL skip option (`--insecure`)
- Configurable timeout per server (`--timeout <ms>`)
- Move server between scopes (`/mcp move`)
- Export/Import server configuration

---

**Repository:** [github.com/ElieMessieCode/pi-mcp](https://github.com/ElieMessieCode/pi-mcp)
