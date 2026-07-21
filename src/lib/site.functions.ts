import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function pub() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const url = process.env.SUPABASE_URL!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const getSiteData = createServerFn({ method: "GET" }).handler(async () => {
  const sb = pub();
  const [settings, announcements, faq, staff, products, categories] = await Promise.all([
    sb.from("site_settings").select("key,value"),
    sb.from("announcements").select("*").eq("published", true).order("pinned", { ascending: false }).order("sort_order"),
    sb.from("faq").select("*").eq("published", true).order("sort_order"),
    sb.from("staff").select("*").order("sort_order"),
    sb.from("products").select("*").order("sort_order"),
    sb.from("categories").select("*").order("sort_order"),
  ]);
  const settingsMap: Record<string, any> = {};
  for (const row of settings.data ?? []) settingsMap[row.key] = row.value;
  return {
    settings: settingsMap,
    announcements: announcements.data ?? [],
    faq: faq.data ?? [],
    staff: staff.data ?? [],
    products: products.data ?? [],
    categories: categories.data ?? [],
  };
});
