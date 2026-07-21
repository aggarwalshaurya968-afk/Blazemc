import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSiteData } from "@/lib/site.functions";
import {
  amIAdmin, claimAdmin,
  updateSetting,
  upsertAnnouncement, deleteAnnouncement,
  upsertFaq, deleteFaq,
  upsertProduct, deleteProduct,
  upsertCategory,
  upsertStaff, deleteStaff,
  listWebhooks, updateWebhook, testWebhook,
  listAuditLogs,
} from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

type Tab = "settings" | "hero" | "server" | "social" | "announcements" | "faq" | "products" | "categories" | "staff" | "webhooks" | "audit";

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const check = useServerFn(amIAdmin);
  const claim = useServerFn(claimAdmin);

  const meQ = useQuery({ queryKey: ["me"], queryFn: () => check() });
  const [tab, setTab] = useState<Tab>("settings");

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (meQ.isPending) return <Shell><p style={{ color: "var(--ash)" }}>Loading…</p></Shell>;
  if (meQ.error) return <Shell><p style={{ color: "var(--accent)" }}>Error: {String((meQ.error as Error).message)}</p></Shell>;

  if (!meQ.data?.admin) {
    return (
      <Shell>
        <div className="pxcard" style={{ maxWidth: 520 }}>
          <div className="eyebrow">Not an admin</div>
          <h1 className="display" style={{ fontSize: "2rem", color: "var(--highlight)", marginTop: 6 }}>Claim admin</h1>
          <p style={{ color: "var(--ash)", marginTop: 8 }}>Signed in as <b>{meQ.data?.email}</b>. If no admin exists yet, you can claim the role once.</p>
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button className="mc-btn primary" onClick={async () => {
              try { const r = await claim(); if (r.claimed) { toast.success("You are now admin."); qc.invalidateQueries({ queryKey: ["me"] }); } else toast.error("An admin already exists."); }
              catch (e: any) { toast.error(e.message); }
            }}>Claim admin role</button>
            <button className="mc-btn sm" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        <aside style={{ minWidth: 200, position: "sticky", top: 90 }}>
          <div className="eyebrow">Admin</div>
          <h2 className="display" style={{ fontSize: "1.6rem", color: "var(--highlight)", marginBottom: 12 }}>Control Panel</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {(["settings","hero","server","social","announcements","faq","products","categories","staff","webhooks","audit"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={"mc-btn sm" + (tab === t ? " primary" : "")}
                style={{ justifyContent: "flex-start", textTransform: "capitalize" }}>{t}</button>
            ))}
            <a href="/" className="mc-btn sm" style={{ marginTop: 12, justifyContent: "flex-start" }}>← View site</a>
            <button className="mc-btn sm" onClick={signOut} style={{ justifyContent: "flex-start" }}>Sign out</button>
          </div>
        </aside>

        <main style={{ flex: 1, minWidth: 320 }}>
          {tab === "settings" && <SettingsTab kind="branding" title="Branding" />}
          {tab === "hero" && <SettingsTab kind="hero" title="Hero Section" />}
          {tab === "server" && <SettingsTab kind="server" title="Server / IP" />}
          {tab === "social" && <SettingsTab kind="social" title="Social Links" />}
          {tab === "announcements" && <AnnouncementsTab />}
          {tab === "faq" && <FaqTab />}
          {tab === "products" && <ProductsTab />}
          {tab === "categories" && <CategoriesTab />}
          {tab === "staff" && <StaffTab />}
          {tab === "webhooks" && <WebhooksTab />}
          {tab === "audit" && <AuditTab />}
          <div style={{ height: 4, background: "var(--line)", margin: "40px 0" }} />
          <MaintenanceCard />
        </main>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", padding: "80px 24px 60px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>{children}</div>
    </div>
  );
}

function useSiteData() {
  return useQuery({ queryKey: ["site"], queryFn: () => getSiteData() });
}

// ---------- Settings (KV) ----------
function SettingsTab({ kind, title }: { kind: string; title: string }) {
  const qc = useQueryClient();
  const { data } = useSiteData();
  const [json, setJson] = useState<string>("");
  const upd = useServerFn(updateSetting);
  useEffect(() => { setJson(JSON.stringify(data?.settings?.[kind] ?? {}, null, 2)); }, [data, kind]);
  const mut = useMutation({
    mutationFn: async () => {
      const parsed = JSON.parse(json);
      return upd({ data: { key: kind, value: parsed } });
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["site"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const val = (data?.settings?.[kind] ?? {}) as Record<string, any>;
  return (
    <div className="pxcard">
      <div className="eyebrow">Section</div>
      <h2 className="display" style={{ fontSize: "2rem", color: "var(--highlight)" }}>{title}</h2>
      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        {Object.entries(val).map(([k, v]) => (
          <KVRow key={k} k={k} v={v} onChange={(nv) => {
            const next = { ...val, [k]: nv };
            setJson(JSON.stringify(next, null, 2));
          }} />
        ))}
      </div>
      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: "pointer", color: "var(--ash)", fontSize: ".85rem" }}>Raw JSON (advanced)</summary>
        <textarea className="field" style={{ minHeight: 200, fontFamily: "Share Tech Mono", fontSize: ".85rem", marginTop: 8 }} value={json} onChange={e => setJson(e.target.value)} />
      </details>
      <button className="mc-btn primary" style={{ marginTop: 14 }} disabled={mut.isPending} onClick={() => mut.mutate()}>Save changes</button>
    </div>
  );
}

function KVRow({ k, v, onChange }: { k: string; v: any; onChange: (v: any) => void }) {
  if (typeof v === "boolean") {
    return (
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={v} onChange={e => onChange(e.target.checked)} />
        <span className="pixel" style={{ color: "var(--ash)" }}>{k}</span>
      </label>
    );
  }
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span className="pixel" style={{ color: "var(--ash)" }}>{k}</span>
      <input className="field" value={String(v ?? "")} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

// ---------- Maintenance quick toggle ----------
function MaintenanceCard() {
  const qc = useQueryClient();
  const { data } = useSiteData();
  const m = (data?.settings?.maintenance ?? { enabled: false, message: "" }) as { enabled: boolean; message: string };
  const upd = useServerFn(updateSetting);
  const [msg, setMsg] = useState(m.message);
  useEffect(() => setMsg(m.message), [m.message]);
  return (
    <div className="pxcard">
      <div className="eyebrow">Danger</div>
      <h2 className="display" style={{ fontSize: "1.6rem", color: "var(--highlight)" }}>Maintenance mode</h2>
      <p style={{ color: "var(--ash)", marginTop: 6, fontSize: ".9rem" }}>When enabled, all visitors see the maintenance screen.</p>
      <textarea className="field" style={{ marginTop: 10 }} value={msg} onChange={e => setMsg(e.target.value)} />
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button className="mc-btn" onClick={async () => {
          await upd({ data: { key: "maintenance", value: { enabled: !m.enabled, message: msg } } });
          toast.success(m.enabled ? "Maintenance OFF" : "Maintenance ON");
          qc.invalidateQueries({ queryKey: ["site"] });
        }}>{m.enabled ? "Disable" : "Enable"} maintenance</button>
      </div>
    </div>
  );
}

// ---------- Announcements ----------
function AnnouncementsTab() {
  const qc = useQueryClient();
  const { data } = useSiteData();
  const upsert = useServerFn(upsertAnnouncement);
  const del = useServerFn(deleteAnnouncement);
  const [editing, setEditing] = useState<any>(null);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 className="display" style={{ fontSize: "2rem", color: "var(--highlight)" }}>Announcements</h2>
        <button className="mc-btn primary sm" onClick={() => setEditing({ title: "", body: "", published: true, pinned: false, sort_order: 0 })}>+ New</button>
      </div>
      {editing && (
        <div className="pxcard" style={{ marginBottom: 16 }}>
          <input className="field" placeholder="Title" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} />
          <textarea className="field" style={{ marginTop: 8, minHeight: 100 }} placeholder="Body" value={editing.body ?? ""} onChange={e => setEditing({ ...editing, body: e.target.value })} />
          <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            <label><input type="checkbox" checked={editing.published} onChange={e => setEditing({ ...editing, published: e.target.checked })} /> Published</label>
            <label><input type="checkbox" checked={editing.pinned} onChange={e => setEditing({ ...editing, pinned: e.target.checked })} /> Pinned</label>
            <label>Order <input className="field" style={{ width: 80, display: "inline-block" }} type="number" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></label>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button className="mc-btn primary" onClick={async () => {
              try { await upsert({ data: editing }); toast.success("Saved"); qc.invalidateQueries({ queryKey: ["site"] }); setEditing(null); }
              catch (e: any) { toast.error(e.message); }
            }}>Save</button>
            <button className="mc-btn sm" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gap: 10 }}>
        {data?.announcements.map(a => (
          <div key={a.id} className="pxcard" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div><b style={{ color: "var(--highlight)" }}>{a.title}</b> {a.pinned && <span className="pixel" style={{ color: "var(--accent)" }}> [PIN]</span>}<div style={{ color: "var(--ash)", fontSize: ".85rem", marginTop: 4 }}>{a.body}</div></div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button className="mc-btn sm" onClick={() => setEditing(a)}>Edit</button>
              <button className="mc-btn sm" onClick={async () => { if (!confirm("Delete?")) return; await del({ data: { id: a.id } }); toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["site"] }); }}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- FAQ ----------
function FaqTab() {
  const qc = useQueryClient();
  const { data } = useSiteData();
  const upsert = useServerFn(upsertFaq);
  const del = useServerFn(deleteFaq);
  const [editing, setEditing] = useState<any>(null);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 className="display" style={{ fontSize: "2rem", color: "var(--highlight)" }}>FAQ</h2>
        <button className="mc-btn primary sm" onClick={() => setEditing({ question: "", answer: "", sort_order: 0, published: true })}>+ New</button>
      </div>
      {editing && (
        <div className="pxcard" style={{ marginBottom: 16 }}>
          <input className="field" placeholder="Question" value={editing.question} onChange={e => setEditing({ ...editing, question: e.target.value })} />
          <textarea className="field" style={{ marginTop: 8, minHeight: 100 }} placeholder="Answer" value={editing.answer} onChange={e => setEditing({ ...editing, answer: e.target.value })} />
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button className="mc-btn primary" onClick={async () => {
              try { await upsert({ data: editing }); toast.success("Saved"); qc.invalidateQueries({ queryKey: ["site"] }); setEditing(null); }
              catch (e: any) { toast.error(e.message); }
            }}>Save</button>
            <button className="mc-btn sm" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gap: 10 }}>
        {data?.faq.map(f => (
          <div key={f.id} className="pxcard" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div><b style={{ color: "var(--highlight)" }}>{f.question}</b><div style={{ color: "var(--ash)", fontSize: ".85rem", marginTop: 4 }}>{f.answer}</div></div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button className="mc-btn sm" onClick={() => setEditing(f)}>Edit</button>
              <button className="mc-btn sm" onClick={async () => { if (!confirm("Delete?")) return; await del({ data: { id: f.id } }); toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["site"] }); }}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Products ----------
function ProductsTab() {
  const qc = useQueryClient();
  const { data } = useSiteData();
  const upsert = useServerFn(upsertProduct);
  const del = useServerFn(deleteProduct);
  const [editing, setEditing] = useState<any>(null);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 className="display" style={{ fontSize: "2rem", color: "var(--highlight)" }}>Products</h2>
        <button className="mc-btn primary sm" onClick={() => setEditing({ name: "", slug: "", description: "", price: 0, sale_price: null, image_url: "", badge: "", featured: false, in_stock: true, perks: [], sort_order: 0, category_id: data?.categories[0]?.id ?? null })}>+ New</button>
      </div>
      {editing && (
        <div className="pxcard" style={{ marginBottom: 16, display: "grid", gap: 8 }}>
          <input className="field" placeholder="Name" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
          <input className="field" placeholder="Slug (url-friendly)" value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value })} />
          <textarea className="field" placeholder="Description" value={editing.description ?? ""} onChange={e => setEditing({ ...editing, description: e.target.value })} />
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
            <label>Price <input className="field" type="number" step="0.01" value={editing.price} onChange={e => setEditing({ ...editing, price: Number(e.target.value) })} /></label>
            <label>Sale price <input className="field" type="number" step="0.01" value={editing.sale_price ?? ""} onChange={e => setEditing({ ...editing, sale_price: e.target.value === "" ? null : Number(e.target.value) })} /></label>
          </div>
          <input className="field" placeholder="Image URL" value={editing.image_url ?? ""} onChange={e => setEditing({ ...editing, image_url: e.target.value })} />
          <input className="field" placeholder="Badge (SALE, NEW, POPULAR…)" value={editing.badge ?? ""} onChange={e => setEditing({ ...editing, badge: e.target.value })} />
          <select className="field" value={editing.category_id ?? ""} onChange={e => setEditing({ ...editing, category_id: e.target.value || null })}>
            <option value="">— no category —</option>
            {data?.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <textarea className="field" placeholder="Perks (one per line)" value={(editing.perks as string[]).join("\n")} onChange={e => setEditing({ ...editing, perks: e.target.value.split("\n").filter(Boolean) })} />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <label><input type="checkbox" checked={editing.featured} onChange={e => setEditing({ ...editing, featured: e.target.checked })} /> Featured</label>
            <label><input type="checkbox" checked={editing.in_stock} onChange={e => setEditing({ ...editing, in_stock: e.target.checked })} /> In stock</label>
            <label>Order <input className="field" style={{ width: 80, display: "inline-block" }} type="number" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></label>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="mc-btn primary" onClick={async () => {
              try { await upsert({ data: editing }); toast.success("Saved"); qc.invalidateQueries({ queryKey: ["site"] }); setEditing(null); }
              catch (e: any) { toast.error(e.message); }
            }}>Save</button>
            <button className="mc-btn sm" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gap: 10 }}>
        {data?.products.map(p => (
          <div key={p.id} className="pxcard" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div><b style={{ color: "var(--highlight)" }}>{p.name}</b> — <span style={{ color: "var(--accent)" }}>${p.sale_price ?? p.price}</span>{p.featured && <span className="pixel" style={{ color: "var(--accent)" }}> [FEAT]</span>}<div style={{ color: "var(--ash)", fontSize: ".85rem" }}>{p.description}</div></div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button className="mc-btn sm" onClick={() => setEditing({ ...p, perks: (p.perks as string[]) })}>Edit</button>
              <button className="mc-btn sm" onClick={async () => { if (!confirm("Delete?")) return; await del({ data: { id: p.id } }); toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["site"] }); }}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Categories ----------
function CategoriesTab() {
  const qc = useQueryClient();
  const { data } = useSiteData();
  const upsert = useServerFn(upsertCategory);
  const [editing, setEditing] = useState<any>(null);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 className="display" style={{ fontSize: "2rem", color: "var(--highlight)" }}>Categories</h2>
        <button className="mc-btn primary sm" onClick={() => setEditing({ name: "", slug: "", description: "", sort_order: 0 })}>+ New</button>
      </div>
      {editing && (
        <div className="pxcard" style={{ marginBottom: 16 }}>
          <input className="field" placeholder="Name" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
          <input className="field" style={{ marginTop: 8 }} placeholder="Slug" value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value })} />
          <input className="field" style={{ marginTop: 8 }} placeholder="Description" value={editing.description ?? ""} onChange={e => setEditing({ ...editing, description: e.target.value })} />
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button className="mc-btn primary" onClick={async () => {
              try { await upsert({ data: editing }); toast.success("Saved"); qc.invalidateQueries({ queryKey: ["site"] }); setEditing(null); }
              catch (e: any) { toast.error(e.message); }
            }}>Save</button>
            <button className="mc-btn sm" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gap: 10 }}>
        {data?.categories.map(c => (
          <div key={c.id} className="pxcard" style={{ display: "flex", justifyContent: "space-between" }}>
            <div><b style={{ color: "var(--highlight)" }}>{c.name}</b> <span style={{ color: "var(--ash)", fontSize: ".85rem" }}>/{c.slug}</span></div>
            <button className="mc-btn sm" onClick={() => setEditing(c)}>Edit</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Staff ----------
function StaffTab() {
  const qc = useQueryClient();
  const { data } = useSiteData();
  const upsert = useServerFn(upsertStaff);
  const del = useServerFn(deleteStaff);
  const [editing, setEditing] = useState<any>(null);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 className="display" style={{ fontSize: "2rem", color: "var(--highlight)" }}>Staff</h2>
        <button className="mc-btn primary sm" onClick={() => setEditing({ name: "", role: "Moderator", minecraft_username: "", discord_handle: "", bio: "", avatar_url: "", sort_order: 0 })}>+ New</button>
      </div>
      {editing && (
        <div className="pxcard" style={{ marginBottom: 16, display: "grid", gap: 8 }}>
          <input className="field" placeholder="Name" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
          <input className="field" placeholder="Role (Owner, Admin, Moderator…)" value={editing.role} onChange={e => setEditing({ ...editing, role: e.target.value })} />
          <input className="field" placeholder="Minecraft username" value={editing.minecraft_username ?? ""} onChange={e => setEditing({ ...editing, minecraft_username: e.target.value })} />
          <input className="field" placeholder="Discord handle" value={editing.discord_handle ?? ""} onChange={e => setEditing({ ...editing, discord_handle: e.target.value })} />
          <textarea className="field" placeholder="Bio" value={editing.bio ?? ""} onChange={e => setEditing({ ...editing, bio: e.target.value })} />
          <input className="field" placeholder="Avatar URL (optional; uses MC head if empty)" value={editing.avatar_url ?? ""} onChange={e => setEditing({ ...editing, avatar_url: e.target.value })} />
          <div style={{ display: "flex", gap: 10 }}>
            <button className="mc-btn primary" onClick={async () => {
              try { await upsert({ data: editing }); toast.success("Saved"); qc.invalidateQueries({ queryKey: ["site"] }); setEditing(null); }
              catch (e: any) { toast.error(e.message); }
            }}>Save</button>
            <button className="mc-btn sm" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gap: 10 }}>
        {data?.staff.map(m => (
          <div key={m.id} className="pxcard" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div><b style={{ color: "var(--highlight)" }}>{m.name}</b> — <span className="pixel" style={{ color: "var(--accent)" }}>{m.role.toUpperCase()}</span></div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="mc-btn sm" onClick={() => setEditing(m)}>Edit</button>
              <button className="mc-btn sm" onClick={async () => { if (!confirm("Delete?")) return; await del({ data: { id: m.id } }); toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["site"] }); }}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Webhooks ----------
function WebhooksTab() {
  const list = useServerFn(listWebhooks);
  const upd = useServerFn(updateWebhook);
  const test = useServerFn(testWebhook);
  const q = useQuery({ queryKey: ["webhooks"], queryFn: () => list() });
  const [local, setLocal] = useState<Record<string, { url: string; enabled: boolean }>>({});
  useEffect(() => {
    if (q.data) {
      const m: any = {}; for (const r of q.data) m[r.id] = { url: r.url ?? "", enabled: r.enabled };
      setLocal(m);
    }
  }, [q.data]);
  return (
    <div>
      <h2 className="display" style={{ fontSize: "2rem", color: "var(--highlight)" }}>Discord Webhooks</h2>
      <p style={{ color: "var(--ash)", marginTop: 6, fontSize: ".9rem" }}>Paste your Discord webhook URLs. Events fire automatically.</p>
      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        {q.data?.map(w => (
          <div key={w.id} className="pxcard">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><b style={{ color: "var(--highlight)" }}>{w.label}</b> <span className="pixel" style={{ color: "var(--ash)" }}> {w.event_type}</span></div>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: ".85rem", color: "var(--ash)" }}>
                <input type="checkbox" checked={local[w.id]?.enabled ?? w.enabled} onChange={e => setLocal({ ...local, [w.id]: { ...(local[w.id] ?? { url: w.url ?? "" }), enabled: e.target.checked } })} /> Enabled
              </label>
            </div>
            <input className="field" style={{ marginTop: 8 }} placeholder="https://discord.com/api/webhooks/…"
              value={local[w.id]?.url ?? ""} onChange={e => setLocal({ ...local, [w.id]: { ...(local[w.id] ?? { enabled: w.enabled }), url: e.target.value } })} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="mc-btn primary sm" onClick={async () => {
                try { await upd({ data: { id: w.id, url: local[w.id]?.url ?? "", enabled: local[w.id]?.enabled ?? w.enabled } }); toast.success("Saved"); }
                catch (e: any) { toast.error(e.message); }
              }}>Save</button>
              <button className="mc-btn sm" onClick={async () => {
                try { await test({ data: { event_type: w.event_type } }); toast.success("Test sent"); }
                catch (e: any) { toast.error(e.message); }
              }}>Test</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Audit ----------
function AuditTab() {
  const list = useServerFn(listAuditLogs);
  const q = useQuery({ queryKey: ["audit"], queryFn: () => list() });
  return (
    <div>
      <h2 className="display" style={{ fontSize: "2rem", color: "var(--highlight)" }}>Audit log</h2>
      <div style={{ display: "grid", gap: 6, marginTop: 16 }}>
        {q.data?.map((r: any) => (
          <div key={r.id} className="pxcard" style={{ padding: 12, fontFamily: "Share Tech Mono", fontSize: ".85rem" }}>
            <span style={{ color: "var(--ash)" }}>{new Date(r.created_at).toLocaleString()}</span>{" — "}
            <b style={{ color: "var(--highlight)" }}>{r.action}</b>{" "}
            <span style={{ color: "var(--accent)" }}>{r.entity}{r.entity_id ? " " + r.entity_id.slice(0, 8) : ""}</span>{" "}
            <span style={{ color: "var(--ash)" }}>by {r.actor_email ?? r.actor_id?.slice(0, 8)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
