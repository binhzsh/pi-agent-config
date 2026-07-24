/**
 * pi-mcp - MCP (Model Context Protocol) Server Extension for Pi
 * 
 * Allows connecting to MCP servers via HTTP and using their tools
 * within Pi agent sessions.
 * 
 * Features:
 * - Connect to MCP servers via HTTP/SSE or Streamable HTTP
 * - Auto-discover tools from connected servers
 * - Register MCP tools as native Pi tools
 * - Manage server connections via commands
 * - Persistent configuration across sessions
 * 
 * Usage:
 *   /mcp add <name> <url>     - Add and connect to an MCP server
 *   /mcp remove <name>        - Remove an MCP server
 *   /mcp list                 - List all configured servers
 *   /mcp connect <name>       - Connect to a server
 *   /mcp disconnect <name>    - Disconnect from a server
 *   /mcp tools [name]         - List tools from server(s)
 *   /mcp status               - Show connection status
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type, Static } from "@sinclair/typebox";
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// Config file paths for persistence
// Global config: shared across all projects
const GLOBAL_CONFIG_DIR = join(homedir(), ".pi", "agent", "mcp");
const GLOBAL_CONFIG_FILE = join(GLOBAL_CONFIG_DIR, "servers.json");

// Project config: specific to current project (saved in project root)
const PROJECT_CONFIG_DIR = ".pi/mcp";
const PROJECT_CONFIG_FILE = join(PROJECT_CONFIG_DIR, "servers.json");

// Log file (always in global dir for easy access)
const LOG_FILE = join(GLOBAL_CONFIG_DIR, "debug.log");

// Scope type for server configuration
type ConfigScope = "global" | "project";

// Debug logger that writes to file
function mcpLog(...args: unknown[]): void {
  const timestamp = new Date().toISOString();
  const message = args.map(a => typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)).join(" ");
  const logLine = `[${timestamp}] ${message}\n`;
  
  
  // Write to file only (view with /mcp-logs command)
  try {
    appendFileSync(LOG_FILE, logLine, "utf-8");
  } catch {
    // Ignore file write errors
  }
}

// ============================================================================
// Types
// ============================================================================

const MCPServerConfig = Type.Object({
  name: Type.String({ description: "Server name identifier" }),
  url: Type.String({ description: "MCP server HTTP URL" }),
  transport: Type.Optional(Type.Union([
    Type.Literal("http"),
    Type.Literal("sse"),
    Type.Literal("streamable"),
  ])),
  headers: Type.Optional(Type.Record(Type.String(), Type.String())),
  enabled: Type.Boolean({ description: "Whether server is enabled" }),
  insecure: Type.Optional(Type.Boolean({ description: "Skip TLS/SSL verification" })),
  timeout: Type.Optional(Type.Number({ description: "Request timeout in milliseconds" })),
});

type MCPServerConfig = Static<typeof MCPServerConfig>;

interface MCPServerState {
  config: MCPServerConfig;
  connected: boolean;
  tools: MCPTool[];
  resources?: MCPResource[];
  prompts?: MCPPrompt[];
  lastError?: string;
  lastConnected?: number;
}

interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: unknown;
}

interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface JSONRPCNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}

interface MCPToolCallResult {
  content: Array<{
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
    uri?: string;
  }>;
  isError?: boolean;
}

// ============================================================================
// MCP Client
// ============================================================================

class MCPHTTPClient {
  private requestId = 0;
  private url: string;
  private headers: Record<string, string>;
  private transport: "http" | "sse" | "streamable";
  private abortController: AbortController | null = null;
  private eventSource: EventSource | null = null;
  private pendingRequests: Map<string | number, {
    resolve: (value: JSONRPCResponse) => void;
    reject: (error: Error) => void;
  }> = new Map();
  private onNotification?: (notification: JSONRPCNotification) => void;
  private sessionId: string | null = null;
  private insecure: boolean;
  private timeout: number;

  constructor(
    url: string,
    headers: Record<string, string> = {},
    transport: "http" | "sse" | "streamable" = "streamable",
    insecure: boolean = false,
    timeout: number = 30000
  ) {
    this.url = url.replace(/\/$/, "");
    this.headers = {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      ...headers,
    };
    this.transport = transport;
    this.insecure = insecure;
    this.timeout = timeout;
    
    if (insecure) {
      mcpLog(`WARNING: TLS/SSL verification disabled for ${url}`);
    }
  }

  // Get current headers including session ID
  private getHeaders(): Record<string, string> {
    const h = { ...this.headers };
    if (this.sessionId) {
      h["Mcp-Session-Id"] = this.sessionId;
    }
    return h;
  }

  // Extract and store session ID from response headers
  private extractSessionId(response: Response): void {
    const sessionId = response.headers.get("mcp-session-id") 
      ?? response.headers.get("Mcp-Session-Id")
      ?? response.headers.get("MCP-SESSION-ID");
    if (sessionId) {
      this.sessionId = sessionId;
    }
  }

  private generateId(): number {
    return ++this.requestId;
  }

  async initialize(): Promise<{ capabilities: Record<string, unknown>; serverInfo: { name: string; version: string } }> {
    mcpLog("Sending initialize request...");
    const response = await this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "pi-mcp",
        version: "1.0.0",
      },
    });
    mcpLog("Initialize response:", response);

    if (response.error) {
      throw new Error(`Initialize failed: ${response.error.message}`);
    }

    // Send initialized notification
    mcpLog("Sending notifications/initialized...");
    await this.sendNotification("notifications/initialized", {});

    return response.result as { capabilities: Record<string, unknown>; serverInfo: { name: string; version: string } };
  }

  async listTools(): Promise<MCPTool[]> {
    mcpLog("Requesting tools/list...");
    const response = await this.sendRequest("tools/list", {});
    mcpLog("tools/list response:", response);
    if (response.error) {
      throw new Error(`ListTools failed: ${response.error.message}`);
    }
    const tools = (response.result as { tools: MCPTool[] })?.tools ?? [];
    mcpLog(`Found ${tools.length} tools:`, tools.map(t => t.name));
    return tools;
  }

  async listResources(): Promise<MCPResource[]> {
    const response = await this.sendRequest("resources/list", {});
    if (response.error) {
      throw new Error(`ListResources failed: ${response.error.message}`);
    }
    return (response.result as { resources: MCPResource[] })?.resources ?? [];
  }

  async listPrompts(): Promise<MCPPrompt[]> {
    const response = await this.sendRequest("prompts/list", {});
    if (response.error) {
      throw new Error(`ListPrompts failed: ${response.error.message}`);
    }
    return (response.result as { prompts: MCPPrompt[] })?.prompts ?? [];
  }

  async callTool(name: string, arguments_: Record<string, unknown>): Promise<MCPToolCallResult> {
    const response = await this.sendRequest("tools/call", {
      name,
      arguments: arguments_,
    });
    if (response.error) {
      throw new Error(`Tool call failed: ${response.error.message}`);
    }
    return response.result as MCPToolCallResult;
  }

  private async sendRequest(method: string, params: unknown): Promise<JSONRPCResponse> {
    const id = this.generateId();
    const request: JSONRPCRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout (${this.timeout}ms): ${method}`));
      }, this.timeout);

      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timeoutId);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
      });

      this.doPost(request).catch((error) => {
        this.pendingRequests.delete(id);
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  private async sendNotification(method: string, params: unknown): Promise<void> {
    const notification: JSONRPCNotification = {
      jsonrpc: "2.0",
      method,
      params,
    };
    await this.doPost(notification);
  }

  private async doPost(body: JSONRPCRequest | JSONRPCNotification): Promise<void> {
    // Use getHeaders() to include session ID if available
    const headers = this.getHeaders();
    const bodyStr = JSON.stringify(body);
    mcpLog(`POST ${this.url}`);
    mcpLog(`Request headers:`, headers);
    mcpLog(`Request body:`, body);
    
    const response = await fetch(this.url, {
      method: "POST",
      headers,
      body: bodyStr,
    });

    mcpLog(`Response status: ${response.status} ${response.statusText}`);
    mcpLog(`Response headers:`, Object.fromEntries(response.headers.entries()));

    // Extract session ID from response (server sets this on initialize)
    this.extractSessionId(response);

    // Handle SSE response (streamable HTTP)
    const contentType = response.headers.get("content-type") ?? "";
    
    if (contentType.includes("text/event-stream")) {
      await this.handleSSEResponse(response);
      return;
    }

    // Handle JSON response
    if (response.ok && contentType.includes("application/json")) {
      const jsonResponse = (await response.json()) as JSONRPCResponse;
      if ("id" in jsonResponse && this.pendingRequests.has(jsonResponse.id)) {
        this.pendingRequests.get(jsonResponse.id)?.resolve(jsonResponse);
        this.pendingRequests.delete(jsonResponse.id);
      }
    } else if (!response.ok) {
      // Include response body in error for better debugging
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch {
        // Ignore
      }
      throw new Error(`HTTP error: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ""}`);
    }
  }

  private async handleSSEResponse(response: Response): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data.trim()) {
              try {
                const parsed = JSON.parse(data) as JSONRPCResponse | JSONRPCNotification;
                
                if ("id" in parsed && this.pendingRequests.has(parsed.id)) {
                  this.pendingRequests.get(parsed.id)?.resolve(parsed as JSONRPCResponse);
                  this.pendingRequests.delete(parsed.id);
                } else if ("method" in parsed) {
                  this.onNotification?.(parsed as JSONRPCNotification);
                }
              } catch {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  onNotificationHandler(handler: (notification: JSONRPCNotification) => void): void {
    this.onNotification = handler;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  // Health check - sends a simple request to verify connection
  async healthCheck(): Promise<boolean> {
    try {
      // Try to list tools as a health check
      const response = await this.sendRequest("tools/list", {});
      return !response.error;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    this.abortController?.abort();
    this.pendingRequests.forEach((pending) => {
      pending.reject(new Error("Client closed"));
    });
    this.pendingRequests.clear();
  }
}

// ============================================================================
// Health Check Manager
// ============================================================================

class HealthCheckManager {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private servers: Map<string, MCPServerState>;
  private registeredTools: Set<string>;
  private toolToServer: Map<string, string>;
  private registerMCPTool: (serverName: string, tool: MCPTool) => void;
  private onServerDown: (name: string) => void;
  private onServerRecovered: (name: string) => void;

  constructor(
    servers: Map<string, MCPServerState>,
    registeredTools: Set<string>,
    toolToServer: Map<string, string>,
    registerMCPTool: (serverName: string, tool: MCPTool) => void,
    onServerDown: (name: string) => void,
    onServerRecovered: (name: string) => void
  ) {
    this.servers = servers;
    this.registeredTools = registeredTools;
    this.toolToServer = toolToServer;
    this.registerMCPTool = registerMCPTool;
    this.onServerDown = onServerDown;
    this.onServerRecovered = onServerRecovered;
  }

  start(intervalMs: number = 30000): void {
    if (this.intervalId) {
      this.stop();
    }

    mcpLog(`Health check started (interval: ${intervalMs}ms)`);
    
    this.intervalId = setInterval(() => {
      this.checkAllServers();
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      mcpLog("Health check stopped");
    }
  }

  private async checkAllServers(): Promise<void> {
    for (const [name, state] of this.servers) {
      if (!state.connected) continue;

      const client = (state as any).client as MCPHTTPClient;
      if (!client) continue;

      try {
        const isHealthy = await client.healthCheck();
        
        if (!isHealthy) {
          mcpLog(`Health check FAILED for ${name}`);
          state.lastError = "Health check failed";
          this.onServerDown(name);
        } else if (state.lastError === "Health check failed") {
          // Server recovered from previous failure
          mcpLog(`Health check RECOVERED for ${name}`);
          state.lastError = undefined;
          this.onServerRecovered(name);
        }
      } catch (error) {
        mcpLog(`Health check error for ${name}: ${error}`);
        state.lastError = `Health check error: ${error}`;
        this.onServerDown(name);
      }
    }
  }
}

// ============================================================================
// Extension
// ============================================================================

export default function piMCPExtension(pi: ExtensionAPI) {
  const servers = new Map<string, MCPServerState>();
  const toolToServer = new Map<string, string>(); // toolName -> serverName
  const registeredTools = new Set<string>();
  
  // Auto-reconnect settings
  const MAX_RECONNECT_ATTEMPTS = 3;
  const RECONNECT_DELAY_MS = 5000;
  const reconnectAttempts = new Map<string, number>();
  
  // Health check interval (30 seconds)
  const HEALTH_CHECK_INTERVAL_MS = 30000;
  let healthCheckManager: HealthCheckManager | null = null;

  // Ensure config directory exists
  function ensureConfigDir(path: string): void {
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
    }
  }

  // Load configuration from file
  function loadConfigFromFile(filePath: string): MCPServerConfig[] {
    try {
      if (existsSync(filePath)) {
        const data = readFileSync(filePath, "utf-8");
        return JSON.parse(data) as MCPServerConfig[];
      }
    } catch (error) {
      mcpLog(`Failed to load MCP config from ${filePath}:`, error);
    }
    return [];
  }

  // Save configuration to file
  function saveConfigToFile(filePath: string, config: MCPServerConfig[]): void {
    try {
      const dir = filePath.substring(0, filePath.lastIndexOf("/")) || filePath.substring(0, filePath.lastIndexOf("\\"));
      ensureConfigDir(dir);
      writeFileSync(filePath, JSON.stringify(config, null, 2), "utf-8");
    } catch (error) {
      mcpLog(`Failed to save MCP config to ${filePath}:`, error);
    }
  }

  // Get scope for a server (project or global)
  function getServerScope(serverName: string): ConfigScope {
    const serverState = servers.get(serverName);
    return (serverState?.config as any)?.scope ?? "global";
  }

  // Load all configurations (global + project)
  function loadConfig(): MCPServerConfig[] {
    const globalConfig = loadConfigFromFile(GLOBAL_CONFIG_FILE);
    const projectConfig = loadConfigFromFile(PROJECT_CONFIG_FILE);
    
    // Mark scopes
    globalConfig.forEach((c) => (c as any).scope = "global");
    projectConfig.forEach((c) => (c as any).scope = "project");
    
    // Project config takes precedence for same names
    const merged = new Map<string, MCPServerConfig>();
    globalConfig.forEach((c) => merged.set(c.name, c));
    projectConfig.forEach((c) => merged.set(c.name, c));
    
    return Array.from(merged.values());
  }

  // Save configuration based on scope
  function saveConfig(): void {
    const globalServers: MCPServerConfig[] = [];
    const projectServers: MCPServerConfig[] = [];
    
    for (const state of servers.values()) {
      const scope = (state.config as any)?.scope ?? "global";
      // Remove scope from saved config
      const config = { ...state.config };
      delete (config as any).scope;
      
      if (scope === "project") {
        projectServers.push(config);
      } else {
        globalServers.push(config);
      }
    }
    
    saveConfigToFile(GLOBAL_CONFIG_FILE, globalServers);
    saveConfigToFile(PROJECT_CONFIG_FILE, projectServers);
  }

  // Register a tool from an MCP server
  function registerMCPTool(serverName: string, tool: MCPTool): void {
    const toolFullName = `mcp_${serverName}_${tool.name}`;
    
    if (registeredTools.has(toolFullName)) {
      return;
    }

    registeredTools.add(toolFullName);
    toolToServer.set(toolFullName, serverName);

    // Build parameters schema from tool's inputSchema
    let parameters = Type.Object({});
    if (tool.inputSchema) {
      try {
        parameters = convertJSONSchemaToTypeBox(tool.inputSchema);
      } catch {
        // Fall back to generic object if conversion fails
        parameters = Type.Object({}, { additionalProperties: true });
      }
    }

    pi.registerTool({
      name: toolFullName,
      label: `[MCP:${serverName}] ${tool.name}`,
      description: tool.description ?? `MCP tool: ${tool.name} from server ${serverName}`,
      parameters,
      promptSnippet: `Use the MCP tool "${tool.name}" from server "${serverName}"${tool.description ? `: ${tool.description}` : ""}`,

      async execute(toolCallId, params, signal, onUpdate, ctx) {
        const serverState = servers.get(serverName);
        if (!serverState?.connected) {
          return {
            content: [{ type: "text" as const, text: `Error: MCP server "${serverName}" is not connected` }],
            details: { error: "not_connected" },
            isError: true,
          };
        }

        try {
          const client = (serverState as any).client as MCPHTTPClient;
          const result = await client.callTool(tool.name, params as Record<string, unknown>);

          // Convert MCP result to Pi format
          const content = result.content.map((item) => {
            if (item.type === "text") {
              return { type: "text" as const, text: item.text ?? "" };
            } else if (item.type === "image") {
              return { type: "text" as const, text: `[Image: ${item.mimeType}] ${item.data?.slice(0, 100)}...` };
            } else if (item.type === "resource") {
              return { type: "text" as const, text: `[Resource: ${item.uri}]` };
            }
            return { type: "text" as const, text: JSON.stringify(item) };
          });

          return {
            content,
            details: { server: serverName, tool: tool.name, isError: result.isError },
            isError: result.isError,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text" as const, text: `MCP tool error: ${message}` }],
            details: { error: message },
            isError: true,
          };
        }
      },
    });
  }

  // Convert JSON Schema to TypeBox schema (simplified)
  function convertJSONSchemaToTypeBox(schema: Record<string, unknown>): any {
    const type = schema.type as string | undefined;
    
    if (type === "object" && schema.properties) {
      const properties: Record<string, unknown> = {};
      const required = new Set((schema.required as string[]) ?? []);
      
      for (const [key, value] of Object.entries(schema.properties as Record<string, unknown>)) {
        const prop = value as Record<string, unknown>;
        const propType = prop.type as string | undefined;
        
        switch (propType) {
          case "string":
            properties[key] = Type.String({ 
              description: prop.description as string | undefined,
            });
            break;
          case "number":
            properties[key] = Type.Number({ 
              description: prop.description as string | undefined,
            });
            break;
          case "integer":
            properties[key] = Type.Integer({ 
              description: prop.description as string | undefined,
            });
            break;
          case "boolean":
            properties[key] = Type.Boolean({ 
              description: prop.description as string | undefined,
            });
            break;
          case "array":
            properties[key] = Type.Array(
              convertJSONSchemaToTypeBox(prop.items as Record<string, unknown> ?? {}),
              { description: prop.description as string | undefined }
            );
            break;
          case "object":
            properties[key] = convertJSONSchemaToTypeBox(prop);
            break;
          default:
            properties[key] = Type.Unknown({ 
              description: prop.description as string | undefined,
            });
        }
      }
      
      return Type.Object(properties, { 
        additionalProperties: schema.additionalProperties as boolean | undefined,
      });
    }
    
    return Type.Object({}, { additionalProperties: true });
  }

  // Connect to an MCP server
  async function connectToServer(name: string, ctx: ExtensionContext, silent: boolean = false): Promise<boolean> {
    const serverState = servers.get(name);
    if (!serverState) {
      if (!silent) ctx.ui.notify(`Server "${name}" not found`, "error");
      return false;
    }

    if (serverState.connected) {
      return true; // Already connected, success
    }

    try {
      if (!silent) ctx.ui.setStatus("mcp", `Connecting to ${name}...`);
      
      const client = new MCPHTTPClient(
        serverState.config.url,
        serverState.config.headers,
        serverState.config.transport ?? "streamable",
        serverState.config.insecure ?? false,
        serverState.config.timeout ?? 30000
      );

      // Initialize MCP session
      mcpLog(`Initializing session with ${serverState.config.url}...`);
      const initResult = await client.initialize();
      mcpLog(`Server: ${initResult.serverInfo.name} v${initResult.serverInfo.version}`);
      mcpLog(`Capabilities:`, initResult.capabilities);
      
      // Discover tools
      mcpLog("Discovering tools...");
      const tools = await client.listTools();
      mcpLog(`Discovered ${tools.length} tools`);
      
      // Store client reference
      (serverState as any).client = client;
      serverState.connected = true;
      serverState.tools = tools;
      serverState.lastConnected = Date.now();
      serverState.lastError = undefined;
      serverState.config.enabled = true;

      // Register tools
      for (const tool of tools) {
        registerMCPTool(name, tool);
      }

      saveConfig();
      
      mcpLog(`Connected to ${name}: ${tools.length} tools`);
      ctx.ui.setStatus("mcp", `${Array.from(servers.values()).filter((s) => s.connected).length}/${servers.size} connected`);
      
      if (!silent) {
        const sessionId = client.getSessionId();
        const sessionInfo = sessionId ? ` (session: ${sessionId.slice(0, 8)}...)` : "";
        ctx.ui.notify(
          `Connected to "${initResult.serverInfo.name}" v${initResult.serverInfo.version} - ${tools.length} tools${sessionInfo}`,
          "success"
        );
      }
      
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      serverState.lastError = message;
      serverState.connected = false;
      
      mcpLog(`Failed to connect to ${name}: ${message}`);
      if (!silent) {
        ctx.ui.notify(`Failed to connect to "${name}": ${message}`, "error");
      }
      ctx.ui.setStatus("mcp", "connection failed");
      
      return false;
    }
  }

  // Disconnect from a server
  async function disconnectFromServer(name: string, ctx: ExtensionContext): Promise<void> {
    const serverState = servers.get(name);
    if (!serverState) return;

    try {
      const client = (serverState as any).client as MCPHTTPClient;
      await client?.close();
    } catch {
      // Ignore disconnect errors
    }

    // Unregister tools
    for (const tool of serverState.tools) {
      const toolFullName = `mcp_${name}_${tool.name}`;
      registeredTools.delete(toolFullName);
      toolToServer.delete(toolFullName);
    }

    serverState.connected = false;
    (serverState as any).client = undefined;
    serverState.tools = [];
    serverState.config.enabled = false;

    saveConfig();
    ctx.ui.notify(`Disconnected from "${name}"`, "info");
    ctx.ui.setStatus("mcp", `${Array.from(servers.values()).filter((s) => s.connected).length} connected`);
  }

  // Initialize on session start
  pi.on("session_start", async (_event, ctx) => {
    // Clear log file for fresh start
    try {
      ensureConfigDir(GLOBAL_CONFIG_DIR);
      writeFileSync(LOG_FILE, `=== MCP Debug Log - ${new Date().toISOString()} ===\n`, "utf-8");
    } catch {
      // Ignore
    }
    
    // Load saved server configurations
    const configs = loadConfig();
    
    for (const config of configs) {
      servers.set(config.name, {
        config,
        connected: false,
        tools: [],
      });
    }

    const serverCount = configs.length;
    
    if (serverCount > 0) {
      ctx.ui.setStatus("mcp", `Connecting ${serverCount} server(s)...`);
      
      // Auto-connect to all servers (silent mode - no notifications per server)
      let connectedCount = 0;
      let failedCount = 0;
      
      for (const config of configs) {
        const success = await connectToServer(config.name, ctx, true);
        if (success) {
          connectedCount++;
        } else {
          failedCount++;
        }
      }
      
      const totalTools = Array.from(servers.values())
        .filter((s) => s.connected)
        .reduce((sum, s) => sum + s.tools.length, 0);
      
      ctx.ui.setStatus("mcp", `${connectedCount}/${serverCount} connected, ${totalTools} tools`);
      
      // Show summary notification
      if (connectedCount > 0) {
        const serverDetails = Array.from(servers.values())
          .filter((s) => s.connected)
          .map((s) => `${s.config.name} (${s.tools.length})`)
          .join(", ");
        ctx.ui.notify(`MCP: ${connectedCount} server(s) connected - ${serverDetails}`, "success");
      }
      if (failedCount > 0) {
        ctx.ui.notify(`MCP: ${failedCount} server(s) failed to connect`, "warning");
      }
      
      // Start health check after initial connections
      startHealthCheck(ctx);
    } else {
      ctx.ui.setStatus("mcp", "ready");
    }
  });

  // Handle server down event
  function handleServerDown(name: string): void {
    const state = servers.get(name);
    if (!state) return;

    const attempt = reconnectAttempts.get(name) || 0;
    
    if (attempt >= MAX_RECONNECT_ATTEMPTS) {
      mcpLog(`Max reconnect attempts reached for ${name}, marking as disconnected`);
      // Clean up tools for this server
      unregisterServerTools(name);
      state.connected = false;
      return;
    }

    mcpLog(`Attempting auto-reconnect for ${name} (attempt ${attempt + 1}/${MAX_RECONNECT_ATTEMPTS})`);
    reconnectAttempts.set(name, attempt + 1);

    // Try to reconnect after delay
    setTimeout(async () => {
      try {
        const client = (state as any).client as MCPHTTPClient;
        if (client) {
          await client.close();
        }
        
        // Try to reconnect
        const newClient = new MCPHTTPClient(
          state.config.url,
          state.config.headers,
          state.config.transport ?? "streamable"
        );
        
        await newClient.initialize();
        const tools = await newClient.listTools();
        
        // Reconnection successful
        (state as any).client = newClient;
        state.connected = true;
        state.tools = tools;
        state.lastError = undefined;
        
        // Re-register tools
        for (const tool of tools) {
          registerMCPTool(name, tool);
        }
        
        reconnectAttempts.delete(name);
        mcpLog(`Auto-reconnect successful for ${name}: ${tools.length} tools`);
      } catch (error) {
        mcpLog(`Auto-reconnect failed for ${name}: ${error}`);
        // Will retry on next health check
      }
    }, RECONNECT_DELAY_MS);
  }

  // Handle server recovered event
  function handleServerRecovered(name: string): void {
    reconnectAttempts.delete(name);
    mcpLog(`Server ${name} recovered`);
  }

  // Unregister all tools for a server
  function unregisterServerTools(name: string): void {
    const state = servers.get(name);
    if (!state) return;

    for (const tool of state.tools) {
      const toolFullName = `mcp_${name}_${tool.name}`;
      registeredTools.delete(toolFullName);
      toolToServer.delete(toolFullName);
    }
    
    state.tools = [];
    mcpLog(`Unregistered all tools for server ${name}`);
  }

  // Start health check monitoring
  function startHealthCheck(ctx: ExtensionContext): void {
    if (healthCheckManager) {
      healthCheckManager.stop();
    }

    healthCheckManager = new HealthCheckManager(
      servers,
      registeredTools,
      toolToServer,
      registerMCPTool,
      handleServerDown,
      handleServerRecovered
    );

    healthCheckManager.start(HEALTH_CHECK_INTERVAL_MS);
    mcpLog(`Health check monitoring started (interval: ${HEALTH_CHECK_INTERVAL_MS}ms)`);
  }

  // Cleanup on shutdown
  pi.on("session_shutdown", async () => {
    // Stop health check
    if (healthCheckManager) {
      healthCheckManager.stop();
      healthCheckManager = null;
    }
    
    // Close all connections
    for (const [name, state] of servers) {
      if (state.connected) {
        try {
          const client = (state as any).client as MCPHTTPClient;
          await client?.close();
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  });

  // Register /mcp command
  pi.registerCommand("mcp", {
    description: "Manage MCP server connections",
    
    getArgumentCompletions: (prefix) => {
      const subcommands = ["add", "remove", "list", "connect", "disconnect", "tools", "resources", "prompts", "status", "refresh", "scopes", "logs", "move", "export", "import"];
      const filtered = subcommands.filter((cmd) => cmd.startsWith(prefix));
      return filtered.map((cmd) => ({ value: cmd, label: cmd }));
    },
    
    handler: async (args, ctx) => {
      const parts = args.trim().split(/\s+/);
      const subcommand = parts[0]?.toLowerCase();
      const arg1 = parts[1];
      const arg2 = parts.slice(2).join(" ");

      switch (subcommand) {
        case "add": {
          if (!arg1 || !arg2) {
            ctx.ui.notify(
              "Usage: /mcp add <name> <url> [options]\n" +
              "Options:\n" +
              "  --global            Save to global config (default)\n" +
              "  --project           Save to project config (.pi/mcp/)\n" +
              "  --insecure          Skip TLS/SSL verification\n" +
              "  --timeout <ms>      Request timeout in milliseconds (default: 30000)",
              "warning"
            );
            return;
          }

          const name = arg1;
          const argsRest = arg2;
          
          if (servers.has(name)) {
            ctx.ui.notify(`Server "${name}" already exists. Use /mcp remove first.`, "warning");
            return;
          }

          // Parse flags
          const isProject = argsRest.includes("--project");
          const isInsecure = argsRest.includes("--insecure");
          
          // Parse timeout
          const timeoutMatch = argsRest.match(/--timeout\s+(\d+)/);
          const timeout = timeoutMatch ? parseInt(timeoutMatch[1], 10) : 30000;
          
          // Extract URL (first part before any -- flags)
          const urlMatch = argsRest.match(/^(\S+)/);
          const url = urlMatch?.[1] ?? "";
          
          if (!url) {
            ctx.ui.notify("URL is required", "warning");
            return;
          }

          // Parse optional headers (format: key=value key2=value2, before flags)
          const headers: Record<string, string> = {};
          const beforeFlags = argsRest.split("--")[0];
          const headerParts = beforeFlags.split(" ").slice(1);
          for (const part of headerParts) {
            if (!part) continue;
            const [key, ...valueParts] = part.split("=");
            if (key && valueParts.length > 0) {
              headers[key] = valueParts.join("=");
            }
          }

          const config: MCPServerConfig = {
            name,
            url,
            transport: "streamable",
            headers: Object.keys(headers).length > 0 ? headers : undefined,
            enabled: false,
            insecure: isInsecure || undefined,
            timeout: timeout !== 30000 ? timeout : undefined,
          };
          (config as any).scope = isProject ? "project" : "global";

          servers.set(name, {
            config,
            connected: false,
            tools: [],
          });

          saveConfig();
          const scopeInfo = isProject ? "(project)" : "(global)";
          const flags = [];
          if (isInsecure) flags.push("insecure");
          if (timeout !== 30000) flags.push(`timeout: ${timeout}ms`);
          const flagsInfo = flags.length > 0 ? ` [${flags.join(", ")}]` : "";
          ctx.ui.notify(`Added MCP server "${name}" ${scopeInfo}${flagsInfo} at ${url}. Use /mcp connect ${name} to connect.`, "success");
          break;
        }

        case "remove": {
          if (!arg1) {
            ctx.ui.notify("Usage: /mcp remove <name>", "warning");
            return;
          }

          if (!servers.has(arg1)) {
            ctx.ui.notify(`Server "${arg1}" not found`, "warning");
            return;
          }

          await disconnectFromServer(arg1, ctx);
          servers.delete(arg1);
          saveConfig();
          ctx.ui.notify(`Removed MCP server "${arg1}"`, "info");
          break;
        }

        case "list": {
          const serverList = Array.from(servers.values());
          
          if (serverList.length === 0) {
            ctx.ui.notify("No MCP servers configured. Use /mcp add <name> <url>", "info");
            return;
          }

          // Group by scope
          const globalServers = serverList.filter((s) => (s.config as any)?.scope !== "project");
          const projectServers = serverList.filter((s) => (s.config as any)?.scope === "project");

          const items: string[] = [];
          
          if (globalServers.length > 0) {
            items.push("=== Global Servers ===");
            for (const s of globalServers) {
              const status = s.connected ? "🟢" : "🔴";
              const toolCount = s.tools.length;
              items.push(`${status} ${s.config.name}: ${toolCount} tools - ${s.config.url}`);
            }
          }
          
          if (projectServers.length > 0) {
            items.push("");
            items.push("=== Project Servers ===");
            for (const s of projectServers) {
              const status = s.connected ? "🟢" : "🔴";
              const toolCount = s.tools.length;
              items.push(`${status} ${s.config.name}: ${toolCount} tools - ${s.config.url}`);
            }
          }

          await ctx.ui.select("MCP Servers", items);
          break;
        }

        case "connect": {
          if (!arg1) {
            // No argument: connect to ALL servers
            const serverNames = Array.from(servers.keys());
            
            if (serverNames.length === 0) {
              ctx.ui.notify("No servers configured. Use /mcp add <name> <url>", "info");
              return;
            }

            ctx.ui.notify(`Connecting to ${serverNames.length} server(s)...`, "info");
            
            let connectedCount = 0;
            let failedCount = 0;
            
            for (const name of serverNames) {
              const state = servers.get(name);
              if (state?.connected) {
                connectedCount++;
                continue; // Already connected
              }
              
              const success = await connectToServer(name, ctx);
              if (success) {
                connectedCount++;
              } else {
                failedCount++;
              }
            }

            ctx.ui.notify(
              `Connection complete: ${connectedCount} connected, ${failedCount} failed`,
              failedCount > 0 ? "warning" : "success"
            );
            return;
          }

          // Connect to specific server
          await connectToServer(arg1, ctx);
          break;
        }

        case "disconnect": {
          if (!arg1) {
            // No argument: disconnect from ALL connected servers
            const connectedNames = Array.from(servers.entries())
              .filter(([_, state]) => state.connected)
              .map(([name, _]) => name);
            
            if (connectedNames.length === 0) {
              ctx.ui.notify("No servers connected", "info");
              return;
            }

            for (const name of connectedNames) {
              await disconnectFromServer(name, ctx);
            }
            
            ctx.ui.notify(`Disconnected from ${connectedNames.length} server(s)`, "info");
            return;
          }

          // Disconnect from specific server
          await disconnectFromServer(arg1, ctx);
          break;
        }

        case "tools": {
          const targetName = arg1;
          let toolList: Array<{ server: string; tool: MCPTool }> = [];

          if (targetName) {
            const serverState = servers.get(targetName);
            if (!serverState) {
              ctx.ui.notify(`Server "${targetName}" not found`, "warning");
              return;
            }
            if (!serverState.connected) {
              ctx.ui.notify(`Server "${targetName}" is not connected`, "warning");
              return;
            }
            toolList = serverState.tools.map((t) => ({ server: targetName, tool: t }));
          } else {
            for (const [name, state] of servers) {
              if (state.connected) {
                for (const tool of state.tools) {
                  toolList.push({ server: name, tool });
                }
              }
            }
          }

          if (toolList.length === 0) {
            ctx.ui.notify("No tools available. Connect to a server first.", "info");
            return;
          }

          const items = toolList.map(({ server, tool }) => {
            const desc = tool.description ? ` - ${tool.description}` : "";
            return `[${server}] ${tool.name}${desc}`;
          });

          await ctx.ui.select("MCP Tools", items);
          break;
        }

        case "resources": {
          const targetServer = arg1;
          let resourceList: Array<{ server: string; resource: MCPResource }> = [];

          for (const [name, state] of servers) {
            if (!state.connected) continue;
            if (targetServer && name !== targetServer) continue;

            const client = (state as any).client as MCPHTTPClient;
            if (client) {
              try {
                const resources = await client.listResources();
                for (const resource of resources) {
                  resourceList.push({ server: name, resource });
                }
              } catch {
                // Skip if not supported
              }
            }
          }

          if (resourceList.length === 0) {
            ctx.ui.notify("No resources available. Server may not support resources.", "info");
            return;
          }

          const resourceItems = resourceList.map(({ server, resource }) => {
            const desc = resource.description ? ` - ${resource.description}` : "";
            return `[${server}] ${resource.name}${desc} (${resource.uri})`;
          });

          await ctx.ui.select("MCP Resources", resourceItems);
          break;
        }

        case "prompts": {
          const promptServer = arg1;
          let promptList: Array<{ server: string; prompt: MCPPrompt }> = [];

          for (const [name, state] of servers) {
            if (!state.connected) continue;
            if (promptServer && name !== promptServer) continue;

            const client = (state as any).client as MCPHTTPClient;
            if (client) {
              try {
                const prompts = await client.listPrompts();
                for (const prompt of prompts) {
                  promptList.push({ server: name, prompt });
                }
              } catch {
                // Skip if not supported
              }
            }
          }

          if (promptList.length === 0) {
            ctx.ui.notify("No prompts available. Server may not support prompts.", "info");
            return;
          }

          const promptItems = promptList.map(({ server, prompt }) => {
            const desc = prompt.description ? ` - ${prompt.description}` : "";
            const args = prompt.arguments ? ` (args: ${prompt.arguments.map(a => a.name).join(", ")})` : "";
            return `[${server}] ${prompt.name}${desc}${args}`;
          });

          await ctx.ui.select("MCP Prompts", promptItems);
          break;
        }

        case "move": {
          if (!arg1 || !arg2) {
            ctx.ui.notify("Usage: /mcp move <name> --global|--project", "warning");
            return;
          }

          const serverToMove = servers.get(arg1);
          if (!serverToMove) {
            ctx.ui.notify(`Server "${arg1}" not found`, "warning");
            return;
          }

          const newScope = arg2.includes("--project") ? "project" : "global";
          const currentScope = (serverToMove.config as any)?.scope ?? "global";

          if (currentScope === newScope) {
            ctx.ui.notify(`Server "${arg1}" is already in ${newScope} scope`, "info");
            return;
          }

          (serverToMove.config as any).scope = newScope;
          saveConfig();
          ctx.ui.notify(`Moved "${arg1}" from ${currentScope} to ${newScope} scope`, "success");
          break;
        }

        case "export": {
          const exportPath = arg1 || "mcp-servers-export.json";
          try {
            const exportData = {
              version: "1.0.0",
              exportedAt: new Date().toISOString(),
              servers: Array.from(servers.values()).map((s) => ({
                name: s.config.name,
                url: s.config.url,
                transport: s.config.transport,
                headers: s.config.headers,
                scope: (s.config as any)?.scope ?? "global",
              })),
            };
            writeFileSync(exportPath, JSON.stringify(exportData, null, 2), "utf-8");
            ctx.ui.notify(`Exported ${servers.size} server(s) to ${exportPath}`, "success");
          } catch (error) {
            ctx.ui.notify(`Export failed: ${error}`, "error");
          }
          break;
        }

        case "import": {
          if (!arg1) {
            ctx.ui.notify("Usage: /mcp import <file-path>", "warning");
            return;
          }

          try {
            if (!existsSync(arg1)) {
              ctx.ui.notify(`File not found: ${arg1}`, "error");
              return;
            }

            const importData = JSON.parse(readFileSync(arg1, "utf-8"));
            const importedServers = importData.servers ?? [];
            let imported = 0;
            let skipped = 0;

            for (const server of importedServers) {
              if (servers.has(server.name)) {
                skipped++;
                continue;
              }

              const config: MCPServerConfig = {
                name: server.name,
                url: server.url,
                transport: server.transport ?? "streamable",
                headers: server.headers,
                enabled: false,
              };
              (config as any).scope = server.scope ?? "global";

              servers.set(server.name, {
                config,
                connected: false,
                tools: [],
              });
              imported++;
            }

            saveConfig();
            ctx.ui.notify(`Imported ${imported} server(s), skipped ${skipped} duplicate(s)`, "success");
          } catch (error) {
            ctx.ui.notify(`Import failed: ${error}`, "error");
          }
          break;
        }

        case "status": {
          const connectedServers = Array.from(servers.values()).filter((s) => s.connected);
          const totalTools = connectedServers.reduce((sum, s) => sum + s.tools.length, 0);

          const lines = [
            `MCP Status: ${connectedServers.length}/${servers.size} servers connected`,
            `Total tools registered: ${totalTools}`,
            "",
            "=== Global ===",
          ];

          for (const [name, state] of servers) {
            if ((state.config as any)?.scope === "project") continue;
            const status = state.connected ? "🟢" : "🔴";
            const tools = state.connected ? `(${state.tools.length} tools)` : "";
            const error = state.lastError ? ` - Error: ${state.lastError}` : "";
            lines.push(`${status} ${name}: ${state.config.url} ${tools}${error}`);
          }

          lines.push("", "=== Project ===");
          for (const [name, state] of servers) {
            if ((state.config as any)?.scope !== "project") continue;
            const status = state.connected ? "🟢" : "🔴";
            const tools = state.connected ? `(${state.tools.length} tools)` : "";
            const error = state.lastError ? ` - Error: ${state.lastError}` : "";
            lines.push(`${status} ${name}: ${state.config.url} ${tools}${error}`);
          }

          await ctx.ui.select("MCP Status", lines);
          break;
        }

        case "refresh": {
          if (arg1) {
            // Refresh specific server
            const serverState = servers.get(arg1);
            if (!serverState?.connected) {
              ctx.ui.notify(`Server "${arg1}" is not connected`, "warning");
              return;
            }

            try {
              const client = (serverState as any).client as MCPHTTPClient;
              const tools = await client.listTools();
              serverState.tools = tools;
              ctx.ui.notify(`Refreshed tools for "${arg1}": ${tools.length} tools`, "success");
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              ctx.ui.notify(`Failed to refresh: ${message}`, "error");
            }
          } else {
            // Refresh all connected servers
            for (const [name, state] of servers) {
              if (state.connected) {
                try {
                  const client = (state as any).client as MCPHTTPClient;
                  const tools = await client.listTools();
                  state.tools = tools;
                } catch {
                  // Skip errors during bulk refresh
                }
              }
            }
            ctx.ui.notify("Refreshed all connected servers", "success");
          }
          break;
        }

        case "scopes": {
          ctx.ui.notify(
            "MCP Configuration Scopes:\n\n" +
            `Global:  ${GLOBAL_CONFIG_FILE}\n` +
            "  Shared across all projects\n\n" +
            `Project: ${PROJECT_CONFIG_FILE}\n` +
            "  Specific to current project",
            "info"
          );
          break;
        }

        default:
          ctx.ui.notify(
            "MCP Commands:\n\n" +
            "Server Management:\n" +
            "  /mcp add <name> <url> [options]              Add server\n" +
            "      Options: --global|--project --insecure --timeout <ms>\n" +
            "  /mcp remove <name>                           Remove server\n" +
            "  /mcp list                                    List servers (grouped by scope)\n" +
            "  /mcp status                                  Show connection status\n" +
            "  /mcp scopes                                  Show config file paths\n" +
            "  /mcp move <name> --global|--project          Move server between scopes\n\n" +
            "Connection:\n" +
            "  /mcp connect                                 Connect to ALL servers\n" +
            "  /mcp connect <name>                          Connect to specific server\n" +
            "  /mcp disconnect                              Disconnect from ALL servers\n" +
            "  /mcp disconnect <name>                       Disconnect from specific server\n\n" +
            "Discovery:\n" +
            "  /mcp tools [server]                          List available tools\n" +
            "  /mcp resources [server]                      List available resources\n" +
            "  /mcp prompts [server]                        List available prompts\n" +
            "  /mcp refresh [name]                          Refresh tool list\n\n" +
            "Export/Import:\n" +
            "  /mcp export [file]                           Export servers to JSON\n" +
            "  /mcp import <file>                           Import servers from JSON\n\n" +
            "Quick Commands:\n" +
            "  /mcp-status                                  Quick status overview\n" +
            "  /mcp-logs                                    View debug logs\n" +
            "  /mcp-logs clear                              Clear debug logs",
            "info"
          );
      }
    },
  });

  // Register shortcut for quick server list
  pi.registerCommand("mcp-status", {
    description: "Quick MCP status overview",
    handler: async (_args, ctx) => {
      const connected = Array.from(servers.values()).filter((s) => s.connected);
      
      if (connected.length === 0) {
        ctx.ui.notify("No MCP servers connected", "info");
        return;
      }

      const lines = connected.map((s) => `✓ ${s.config.name}: ${s.tools.length} tools`);
      ctx.ui.notify(`Connected: ${lines.join(", ")}`, "info");
    },
  });

  // Command to view/clear debug logs
  pi.registerCommand("mcp-logs", {
    description: "View or clear MCP debug logs",
    handler: async (args, ctx) => {
      const action = args.trim().toLowerCase();
      
      if (action === "clear") {
        try {
          writeFileSync(LOG_FILE, "", "utf-8");
          ctx.ui.notify("MCP logs cleared", "success");
        } catch {
          ctx.ui.notify("Failed to clear logs", "error");
        }
        return;
      }

      // Read and show logs
      try {
        if (existsSync(LOG_FILE)) {
          const logs = readFileSync(LOG_FILE, "utf-8");
          const lines = logs.split("\n").filter(Boolean).slice(-50); // Last 50 lines
          
          if (lines.length === 0) {
            ctx.ui.notify("No logs yet. Connect to an MCP server first.", "info");
            return;
          }

          await ctx.ui.select("MCP Debug Logs (last 50 lines)", lines);
        } else {
          ctx.ui.notify("No log file found. Connect to an MCP server first.", "info");
        }
      } catch {
        ctx.ui.notify("Failed to read logs", "error");
      }
    },
  });
}
