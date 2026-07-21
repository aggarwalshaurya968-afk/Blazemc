// Server-only Discord webhook helper. Load via dynamic import inside handlers.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function fireDiscordWebhook(eventType: string, payload: {
  title: string; description?: string; color?: number; fields?: { name: string; value: string; inline?: boolean }[];
}) {
  try {
    const { data } = await supabaseAdmin.from("webhooks").select("url,enabled").eq("event_type", eventType).maybeSingle();
    if (!data?.enabled || !data.url) return;
    await fetch(data.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "BlazeMC",
        embeds: [{
          title: payload.title,
          description: payload.description,
          color: payload.color ?? 0xff7a1a,
          fields: payload.fields,
          timestamp: new Date().toISOString(),
        }],
      }),
    });
  } catch (e) {
    console.error("discord webhook failed", eventType, e);
  }
}
