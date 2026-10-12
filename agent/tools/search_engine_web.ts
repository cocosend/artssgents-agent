import { defineTool } from "eve/tools";
import { z } from "zod";

const AGENT_API = "https://artssapp-agent-artssby-apps.vercel.app";

export default defineTool({
  description: "Search the current public web through the authenticated ARTSS search service, returning sources with the response. Use for fresh external research and technical documentation; never claim results that were not returned.",
  inputSchema: z.object({ question: z.string().trim().min(3).max(3000) }),
  async execute({ question }) {
    const secret = process.env.AGENT_EVE_BRIDGE_KEY?.trim();
    if (!secret) throw new Error("Server-to-server ARTSS bridge is not configured.");
    const response = await fetch(`${AGENT_API}/api/web-search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agent-service-key": secret,
      },
      body: JSON.stringify({ question }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(43_000),
    });
    const data = await response.json() as { error?: string; text?: string; sources?: { title: string; url: string }[] };
    if (!response.ok) throw new Error(`ARTSS web search HTTP ${response.status}: ${(data.error || "Unavailable").slice(0, 180)}`);
    return { answer: (data.text || "").slice(0, 6000), sources: (data.sources || []).slice(0, 10) };
  },
});
