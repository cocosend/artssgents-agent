import { defineTool } from "eve/tools";
import { z } from "zod";

const AGENT_API = "https://artssapp-agent-artssby-apps.vercel.app";

export default defineTool({
  description: "Check live operational readiness of the linked ARTSS multi-model coding engine, GitHub writes, Supabase storage, AI providers and production deployment. Call this before claiming a service is unavailable.",
  inputSchema: z.object({}),
  async execute() {
    const response = await fetch(`${AGENT_API}/api/health`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`ARTSS engine health check failed (HTTP ${response.status})`);
    const data: unknown = await response.json();
    if (typeof data !== "object" || data === null) throw new Error("Invalid ARTSS engine response");
    const info = data as {
      ok?: boolean;
      providers?: { configured?: string[] };
      integrations?: { github?: boolean; supabase?: boolean };
      capabilities?: { githubExecutionReady?: boolean; imageGenerationConfigured?: boolean; webSearchConfigured?: boolean };
      executionEnabled?: boolean;
      timestamp?: string;
    };
    return {
      service: "artssapp-agent",
      url: AGENT_API,
      ok: info.ok === true,
      providers: info.providers?.configured || [],
      github: info.integrations?.github === true,
      supabase: info.integrations?.supabase === true,
      executionEnabled: info.executionEnabled === true,
      githubWriteReady: info.capabilities?.githubExecutionReady === true,
      imageGenerationConfigured: info.capabilities?.imageGenerationConfigured === true,
      webSearchConfigured: info.capabilities?.webSearchConfigured === true,
      timestamp: info.timestamp,
    };
  },
});
