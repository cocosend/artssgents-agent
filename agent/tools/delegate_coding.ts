import { defineTool } from "eve/tools";
import { z } from "zod";

const AGENT_API = "https://artssapp-agent-artssby-apps.vercel.app";

export default defineTool({
  description: "Delegate repository analysis, multi-model code generation and optional GitHub branch/commit/PR creation to the real ARTSS coding engine. It uses OpenAI, DeepSeek and Gemini, persists runs to Supabase, and writes only to new agent branches. Use mode=preview to examine changes without any GitHub writes. Use mode=apply ONLY if the user explicitly requested creating/modifying/saving code; do not use apply for research or diagnostics. Never ask for API tokens.",
  inputSchema: z.object({
    task: z.string().trim().min(4).max(8000),
    provider: z.enum(["multi", "openai", "deepseek", "gemini"]).default("multi"),
    mode: z.enum(["preview", "apply"]).default("preview"),
  }),
  async execute({ task, provider, mode }) {
    const secret = process.env.AGENT_EVE_BRIDGE_KEY?.trim();
    if (!secret) throw new Error("Server-to-server ARTSS bridge is not configured.");
    const response = await fetch(`${AGENT_API}/api/v1/agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agent-service-key": secret,
      },
      body: JSON.stringify({
        provider,
        executionMode: mode,
        messages: [{ role: "user", content: task }],
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(110_000),
    });
    const data = await response.json() as {
      error?: string;
      text?: string;
      action?: string;
      provider?: string;
      branch?: string;
      commitSha?: string;
      prUrl?: string;
      deploymentUrl?: string;
      files?: string[];
      contributors?: string[];
    };
    if (!response.ok) {
      throw new Error(`ARTSS coding engine HTTP ${response.status}: ${(data.error || "Request failed").slice(0, 300)}`);
    }
    return {
      action: data.action || "unknown",
      provider: data.provider,
      text: (data.text || "").slice(0, 12000),
      files: data.files || [],
      branch: data.branch,
      commitSha: data.commitSha,
      prUrl: data.prUrl,
      deploymentUrl: data.deploymentUrl,
      mode,
    };
  },
});
