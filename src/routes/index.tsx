import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getSiteData } from "@/lib/site.functions";
import { Nav } from "@/components/blaze/Nav";
import { Embers } from "@/components/blaze/Embers";
import { Footer } from "@/components/blaze/Footer";
import { Reveal } from "@/components/blaze/Reveal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const siteQuery = queryOptions({ queryKey: ["site"], queryFn: () => getSiteData() });

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQuery),
  component: Home,
});

function Home() {
  const { data } = useSuspenseQuery(siteQuery);
  const s = data.settings;
  const server = s.server ?? {};
  const hero = s.hero ?? {};
  const brand = s.branding ?? {};
  const maint = s.maintenance ?? { enabled: false };

  // Realtime: refetch on any content change
  const qc = (window as any).__queryClient;
  useEffect(() => {
    const ch = supabase.channel("site-content")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        try { qc?.invalidateQueries({ queryKey: ["site"] }); } catch {}
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  if (maint.enabled) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="pxcard" style={{ maxWidth: 520, textAlign: "center" }}>
          <div className="eyebrow">Maintenance</div>
          <h1 className="display" style={{ fontSize: "2.4rem", color: "var(--highlight)", marginTop: 8 }}>Be right back</h1>
          <p style={{ color: "var(--ash)", marginTop: 12 }}>{maint.message}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Nav discordUrl={server.discordUrl} siteName={brand.siteName?.toUpperCase()} />
      {/* MOTD ticker */}
      <div style={{ position: "fixed", top: 68, left: 0, right: 0, zIndex: 99, background: "var(--bg2)", borderBottom: "1px solid var(--line)", overflow: "hidden", height: 32, display: "flex", alignItems: "center" }}>
        <div className="motd-inner"><b>MOTD</b> {server.motd} <b>▸</b> {server.motd} <b>▸</b> {server.motd}</div>
      </div>

      {/* HERO */}
      <header style={{ position: "relative", padding: "170px 0 90px", overflow: "hidden" }}>
        <div className="hero-vignette" />
        <Embers />
        <div className="wrap" style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
          <span className="eyebrow">{hero.eyebrow ?? "Semi-vanilla • Java + Bedrock"}</span>
          <h1 className="display" style={{ fontSize: "clamp(3.2rem,9vw,6.6rem)", color: "var(--highlight)", WebkitTextStroke: "2px #2a1005", textShadow: "3px 3px 0 #7a1a0a, 6px 6px 0 #4d0f06, 0 0 40px var(--glow)", letterSpacing: ".02em", marginTop: 18 }}>
            {hero.title ?? brand.siteName?.toUpperCase() ?? "BLAZEMC"}<span className="caret" />
          </h1>
          <p style={{ maxWidth: 600, margin: "22px auto 0", color: "var(--ash)", fontSize: "1.15rem", lineHeight: 1.55 }}>{hero.tag ?? brand.tagline}</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 34, flexWrap: "wrap" }}>
            {(server.discordUrl ?? "https://discord.gg/7AsNnQd9Mk") && <a href={server.discordUrl ?? "https://discord.gg/7AsNnQd9Mk"} target="_blank" rel="noopener" className="mc-btn primary">▶ {hero.ctaLabel ?? "Join Discord"}</a>}
            <a href="/store" className="mc-btn gold">Visit Store</a>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", marginTop: 20, background: "var(--bg2)", border: "2px solid #000" }}>
            <span className="live-dot" /> <span className="pixel">SERVER ONLINE</span>
          </div>

          <IpRow label="Java IP" value={server.javaIp} />
          <IpRow label="Bedrock" value={server.bedrockIp} />

          <div style={{ display: "flex", gap: 44, justifyContent: "center", marginTop: 60, flexWrap: "wrap" }}>
            <Stat b="24/7" t="Uptime" />
            <Stat b={String(data.products.length)} t="Store items" />
            <Stat b={String(data.staff.length)} t="Staff" />
            <Stat b={String(data.announcements.length)} t="News posts" />
          </div>
        </div>
      </header>

      {/* Announcements */}
      <section id="announcements" className="section">
        <div className="wrap">
          <div className="eyebrow">Latest</div>
          <h2 className="section-title">Announcements</h2>
          <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginTop: 30 }}>
            {data.announcements.map((a, i) => (
              <Reveal key={a.id} delay={i * 60}>
                <article className="pxcard">
                  {a.pinned && <span className="tape">PINNED</span>}
                  <div className="eyebrow" style={{ marginBottom: 6 }}>{new Date(a.created_at).toLocaleDateString()}</div>
                  <h3 style={{ fontFamily: "Anton", fontSize: "1.4rem", color: "var(--highlight)" }}>{a.title}</h3>
                  {a.body && <p style={{ color: "var(--ash)", marginTop: 8, fontSize: ".95rem", lineHeight: 1.55 }}>{a.body}</p>}
                </article>
              </Reveal>
            ))}
            {data.announcements.length === 0 && <p style={{ color: "var(--ash)" }}>No posts yet.</p>}
          </div>
        </div>
      </section>

      {/* Store preview */}
      <section id="store" className="section" style={{ background: "var(--bg2)" }}>
        <div className="wrap">
          <div className="eyebrow">Featured</div>
          <h2 className="section-title">Ranks & Perks</h2>
          <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", marginTop: 30 }}>
            {data.products.filter(p => p.featured).slice(0, 6).map((p, i) => (
              <Reveal key={p.id} delay={i * 60}>
                <div className="pxcard" style={{ position: "relative", height: "100%" }}>
                  {p.badge && <span className="tape">{p.badge}</span>}
                  <h3 style={{ fontFamily: "Anton", fontSize: "1.6rem", color: "var(--highlight)" }}>{p.name}</h3>
                  <p style={{ color: "var(--ash)", marginTop: 8, minHeight: 44, fontSize: ".9rem" }}>{p.description}</p>
                  <ul style={{ margin: "12px 0", padding: 0, listStyle: "none", color: "var(--ash)", fontSize: ".85rem" }}>
                    {(p.perks as string[]).map((perk, i) => <li key={i}>▸ {perk}</li>)}
                  </ul>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 12 }}>
                    {p.sale_price != null ? (
                      <>
                        <span style={{ fontFamily: "Anton", fontSize: "1.8rem", color: "var(--accent)" }}>${p.sale_price}</span>
                        <span style={{ textDecoration: "line-through", color: "var(--ash)" }}>${p.price}</span>
                      </>
                    ) : (
                      <span style={{ fontFamily: "Anton", fontSize: "1.8rem", color: "var(--accent)" }}>${p.price}</span>
                    )}
                  </div>
                  <a href="/store" className="mc-btn primary" style={{ marginTop: 12, width: "100%", justifyContent: "center" }}>View in store</a>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Staff */}
      <section id="staff" className="section">
        <div className="wrap">
          <div className="eyebrow">The Crew</div>
          <h2 className="section-title">Staff</h2>
          <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginTop: 30 }}>
            {data.staff.map((m, i) => (
              <Reveal key={m.id} delay={i * 60}>
                <div className="pxcard" style={{ textAlign: "center" }}>
                  <img alt={m.name} src={m.avatar_url ?? `https://mc-heads.net/avatar/${encodeURIComponent(m.minecraft_username ?? m.name)}/96`}
                    style={{ width: 96, height: 96, imageRendering: "pixelated", margin: "0 auto", border: "2px solid #000" }} />
                  <div style={{ fontFamily: "Anton", fontSize: "1.3rem", marginTop: 10, color: "var(--highlight)" }}>{m.name}</div>
                  <div className="pixel" style={{ color: "var(--accent)", marginTop: 4 }}>{m.role.toUpperCase()}</div>
                  {m.bio && <p style={{ color: "var(--ash)", marginTop: 8, fontSize: ".85rem" }}>{m.bio}</p>}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="section" style={{ background: "var(--bg2)" }}>
        <div className="wrap">
          <div className="eyebrow">Answers</div>
          <h2 className="section-title">FAQ</h2>
          <div style={{ marginTop: 30, display: "grid", gap: 12 }}>
            {data.faq.map((q, i) => (
              <Reveal key={q.id} delay={i * 50}>
                <details className="pxcard" style={{ padding: 0 }}>
                  <summary style={{ padding: 16, cursor: "pointer", fontWeight: 700, color: "var(--highlight)", listStyle: "none" }}>
                    ▸ {q.question}
                  </summary>
                  <div style={{ padding: "0 16px 16px", color: "var(--ash)", lineHeight: 1.6 }}>{q.answer}</div>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Footer settings={s} />
    </>
  );
}

function IpRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div style={{ margin: "14px auto 0", maxWidth: 460, display: "flex", alignItems: "center", gap: 10, background: "var(--bg2)", border: "2px solid #000", padding: "12px 12px 12px 18px", boxShadow: "3px 3px 0 #000" }}>
      <div>
        <span style={{ fontFamily: "Share Tech Mono", fontSize: ".7rem", color: "var(--ash)", letterSpacing: ".15em", textTransform: "uppercase", display: "block" }}>{label}</span>
        <span style={{ fontFamily: "Share Tech Mono", fontSize: "1.05rem", color: "var(--highlight)" }}>{value}</span>
      </div>
      <button style={{ marginLeft: "auto" }} className="mc-btn sm" onClick={() => { navigator.clipboard.writeText(value); toast.success(`${label} copied`); }}>Copy</button>
    </div>
  );
}

function Stat({ b, t }: { b: string; t: string }) {
  return (
    <div>
      <b style={{ display: "block", fontFamily: "Anton", fontSize: "2.1rem", color: "var(--highlight)" }}>{b}</b>
      <span style={{ fontSize: ".85rem", color: "var(--ash)", letterSpacing: ".06em" }}>{t}</span>
    </div>
  );
}
