import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getSiteData } from "@/lib/site.functions";
import { Nav } from "@/components/blaze/Nav";
import { Footer } from "@/components/blaze/Footer";
import { toast } from "sonner";

const siteQuery = queryOptions({ queryKey: ["site"], queryFn: () => getSiteData() });

type CartItem = { id: string; name: string; price: number; qty: number };

export const Route = createFileRoute("/store")({
  head: () => ({ meta: [
    { title: "Store — BlazeMC" },
    { name: "description", content: "Ranks, keys, and cosmetics for the BlazeMC Minecraft SMP." },
    { property: "og:title", content: "Store — BlazeMC" },
    { property: "og:description", content: "Support the server and unlock cool perks." },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQuery),
  component: Store,
});

function Store() {
  const { data } = useSuspenseQuery(siteQuery);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [coupon, setCoupon] = useState("");

  const s = data.settings;
  const server = s.server ?? {};
  const brand = s.branding ?? {};

  const filtered = useMemo(() => {
    return data.products.filter(p => {
      if (cat && p.category_id !== cat) return false;
      if (q && !p.name.toLowerCase().includes(q.toLowerCase()) && !(p.description ?? "").toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [data.products, q, cat]);

  const addToCart = (p: any) => {
    const price = p.sale_price ?? p.price;
    setCart(c => {
      const existing = c.find(i => i.id === p.id);
      if (existing) return c.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { id: p.id, name: p.name, price: Number(price), qty: 1 }];
    });
    toast.success(`Added ${p.name} to cart`);
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <>
      <Nav discordUrl={server.discordUrl} siteName={brand.siteName?.toUpperCase()} />
      <div style={{ height: 100 }} />
      <section className="section" style={{ paddingTop: 30 }}>
        <div className="wrap">
          <div className="eyebrow">Support the server</div>
          <h1 className="section-title">Store</h1>

          <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap", alignItems: "center" }}>
            <input className="field" placeholder="Search products…" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 320 }} />
            <button className={"mc-btn sm" + (cat === null ? " primary" : "")} onClick={() => setCat(null)}>All</button>
            {data.categories.map(c => (
              <button key={c.id} className={"mc-btn sm" + (cat === c.id ? " primary" : "")} onClick={() => setCat(c.id)}>{c.name}</button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 30, marginTop: 30, alignItems: "start" }}>
            <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
              {filtered.map(p => (
                <div key={p.id} className="pxcard" style={{ position: "relative" }}>
                  {p.badge && <span className="tape">{p.badge}</span>}
                  {p.image_url && <img src={p.image_url} alt={p.name} style={{ width: "100%", height: 140, objectFit: "cover", border: "2px solid #000", imageRendering: "pixelated" }} />}
                  <h3 style={{ fontFamily: "Anton", fontSize: "1.4rem", color: "var(--highlight)", marginTop: 10 }}>{p.name}</h3>
                  <p style={{ color: "var(--ash)", marginTop: 8, fontSize: ".9rem", minHeight: 40 }}>{p.description}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
                    {p.sale_price != null ? (
                      <>
                        <span style={{ fontFamily: "Anton", fontSize: "1.5rem", color: "var(--accent)" }}>${p.sale_price}</span>
                        <span style={{ textDecoration: "line-through", color: "var(--ash)" }}>${p.price}</span>
                      </>
                    ) : (
                      <span style={{ fontFamily: "Anton", fontSize: "1.5rem", color: "var(--accent)" }}>${p.price}</span>
                    )}
                  </div>
                  <button className="mc-btn primary" style={{ width: "100%", justifyContent: "center", marginTop: 10 }} disabled={!p.in_stock} onClick={() => addToCart(p)}>
                    {p.in_stock ? "Add to cart" : "Out of stock"}
                  </button>
                </div>
              ))}
              {filtered.length === 0 && <p style={{ color: "var(--ash)" }}>Nothing matches your filters.</p>}
            </div>

            <aside className="pxcard" style={{ position: "sticky", top: 110 }}>
              <div className="eyebrow">Cart</div>
              <h3 style={{ fontFamily: "Anton", fontSize: "1.6rem", color: "var(--highlight)", marginTop: 6 }}>Your basket</h3>
              {cart.length === 0 && <p style={{ color: "var(--ash)", marginTop: 8 }}>Empty. Add something spicy.</p>}
              {cart.map(i => (
                <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: ".9rem" }}>
                  <span>{i.name} × {i.qty}</span>
                  <span style={{ color: "var(--accent)" }}>${(i.price * i.qty).toFixed(2)}</span>
                </div>
              ))}
              {cart.length > 0 && (
                <>
                  <input className="field" placeholder="Coupon code" value={coupon} onChange={e => setCoupon(e.target.value)} style={{ marginTop: 10 }} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontFamily: "Anton", fontSize: "1.3rem", color: "var(--highlight)" }}>
                    <span>Total</span><span>${subtotal.toFixed(2)}</span>
                  </div>
                  <button className="mc-btn gold" style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
                    onClick={() => toast("Checkout coming next — cart saved. Ping the owner!", { description: "Payments will be wired up in the next phase." })}>
                    Checkout
                  </button>
                </>
              )}
            </aside>
          </div>
        </div>
      </section>
      <Footer settings={s} />
    </>
  );
}
