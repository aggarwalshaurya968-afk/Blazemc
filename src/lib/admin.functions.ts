import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string; claims: any }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error("role check failed: " + error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

async function audit(ctx: any, action: string, entity?: string, entity_id?: string, meta?: any) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: ctx.userId,
    actor_email: ctx.claims?.email ?? null,
    action, entity, entity_id, meta,
  });
  const { fireDiscordWebhook } = await import("./discord.server");
  await fireDiscordWebhook("audit", {
    title: `Admin: ${action}`,
    description: entity ? `${entity} ${entity_id ?? ""}` : undefined,
    fields: meta ? [{ name: "meta", value: "```json\n" + JSON.stringify(meta).slice(0, 900) + "\n```" }] : undefined,
  });
}

export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("claim_admin");
    if (error) throw new Error(error.message);
    return { claimed: data === true };
  });

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { admin: data === true, userId: context.userId, email: (context.claims as any)?.email };
  });

// --- Site settings (KV) ---
export const updateSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string; value: any }) => z.object({ key: z.string().min(1).max(64), value: z.any() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("site_settings").upsert({ key: data.key, value: data.value, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    await audit(context, "setting.update", "site_settings", data.key, data.value);
    return { ok: true };
  });

// --- Announcements ---
export const upsertAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    id: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    body: z.string().max(4000).optional().nullable(),
    published: z.boolean().default(true),
    pinned: z.boolean().default(false),
    sort_order: z.number().int().default(0),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("announcements").upsert(data as any).select().single();
    if (error) throw new Error(error.message);
    await audit(context, data.id ? "announcement.update" : "announcement.create", "announcements", row.id);
    const { fireDiscordWebhook } = await import("./discord.server");
    if (!data.id) await fireDiscordWebhook("announcement", { title: `📢 ${row.title}`, description: row.body ?? undefined, color: 0xffc85c });
    return row;
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context, "announcement.delete", "announcements", data.id);
    return { ok: true };
  });

// --- FAQ ---
export const upsertFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    id: z.string().uuid().optional(),
    question: z.string().min(1).max(300),
    answer: z.string().min(1).max(2000),
    sort_order: z.number().int().default(0),
    published: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("faq").upsert(data as any).select().single();
    if (error) throw new Error(error.message);
    await audit(context, data.id ? "faq.update" : "faq.create", "faq", row.id);
    return row;
  });

export const deleteFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("faq").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context, "faq.delete", "faq", data.id);
    return { ok: true };
  });

// --- Products ---
export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    id: z.string().uuid().optional(),
    category_id: z.string().uuid().nullable().optional(),
    name: z.string().min(1).max(120),
    slug: z.string().min(1).max(120),
    description: z.string().max(2000).nullable().optional(),
    price: z.number().nonnegative(),
    sale_price: z.number().nonnegative().nullable().optional(),
    image_url: z.string().url().nullable().optional().or(z.literal("")),
    badge: z.string().max(20).nullable().optional(),
    featured: z.boolean().default(false),
    in_stock: z.boolean().default(true),
    perks: z.array(z.string()).default([]),
    sort_order: z.number().int().default(0),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = { ...data, image_url: data.image_url || null };
    const { data: row, error } = await supabaseAdmin.from("products").upsert(payload as any).select().single();
    if (error) throw new Error(error.message);
    await audit(context, data.id ? "product.update" : "product.create", "products", row.id);
    return row;
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context, "product.delete", "products", data.id);
    return { ok: true };
  });

// --- Categories ---
export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(60),
    slug: z.string().min(1).max(60),
    description: z.string().max(500).nullable().optional(),
    sort_order: z.number().int().default(0),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("categories").upsert(data as any).select().single();
    if (error) throw new Error(error.message);
    await audit(context, data.id ? "category.update" : "category.create", "categories", row.id);
    return row;
  });

// --- Staff ---
export const upsertStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(60),
    role: z.string().min(1).max(40),
    minecraft_username: z.string().max(30).nullable().optional(),
    discord_handle: z.string().max(40).nullable().optional(),
    bio: z.string().max(500).nullable().optional(),
    avatar_url: z.string().url().nullable().optional().or(z.literal("")),
    sort_order: z.number().int().default(0),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = { ...data, avatar_url: data.avatar_url || null };
    const { data: row, error } = await supabaseAdmin.from("staff").upsert(payload as any).select().single();
    if (error) throw new Error(error.message);
    await audit(context, data.id ? "staff.update" : "staff.create", "staff", row.id);
    return row;
  });

export const deleteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("staff").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context, "staff.delete", "staff", data.id);
    return { ok: true };
  });

// --- Webhooks ---
export const listWebhooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("webhooks").select("*").order("event_type");
    return data ?? [];
  });

export const updateWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    id: z.string().uuid(),
    url: z.string().url().nullable().or(z.literal("")),
    enabled: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("webhooks").update({ url: data.url || null, enabled: data.enabled }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context, "webhook.update", "webhooks", data.id, { enabled: data.enabled });
    return { ok: true };
  });

export const testWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { event_type: string }) => z.object({ event_type: z.string().max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { fireDiscordWebhook } = await import("./discord.server");
    await fireDiscordWebhook(data.event_type, { title: `🔔 Test — ${data.event_type}`, description: "Webhook test from Admin Panel." });
    return { ok: true };
  });

// --- Audit ---
export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100);
    return data ?? [];
  });
