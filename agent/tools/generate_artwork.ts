import { defineTool } from "eve/tools";
import { z } from "zod";

const AGENT_API = "https://artssapp-agent-artssby-apps.vercel.app";

export default defineTool({
  description: "Generate a real AI image using the ARTSS OpenAI image-generation backend and save it in the private Supabase media bucket. Returns a temporary signed viewing URL instead of leaking or passing megabytes of base64 into the agent context. Use only when the user explicitly requests an image or artwork. The signed URL expires after one hour.",
  inputSchema: z.object({
    prompt: z.string().trim().min(5).max(1600),
    aspect: z.enum(["square", "landscape", "portrait"]).default("square"),
    quality: z.enum(["low", "medium", "high"]).default("medium"),
  }),
  async execute({ prompt, aspect, quality }) {
    const secret = process.env.AGENT_EVE_BRIDGE_KEY?.trim();
    if (!secret) throw new Error("Server-to-server ARTSS bridge is not configured.");
    const response = await fetch(`${AGENT_API}/api/v1/generate-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agent-service-key": secret,
      },
      body: JSON.stringify({ prompt, aspect, quality }),
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(115_000),
    });
    const result = await response.json() as {
      url?: string;
      error?: string;
      size?: string;
      quality?: string;
      expiresIn?: number;
    };
    if (!response.ok) {
      throw new Error(`ARTSS image generation HTTP ${response.status}: ${(result.error || "Unavailable").slice(0, 250)}`);
    }
    if (!result.url?.startsWith("https://")) throw new Error("The image service returned no secure image URL");
    return {
      imageUrl: result.url,
      displayMarkdown: `![Generated image](${result.url})`,
      expiresInSeconds: result.expiresIn ?? 3600,
      aspect,
      resolution: result.size,
      quality: result.quality,
    };
  },
});
