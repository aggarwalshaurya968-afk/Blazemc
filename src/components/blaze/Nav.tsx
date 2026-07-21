import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type World = "overworld" | "nether" | "end";

export function Nav({ discordUrl, siteName = "BLAZEMC" }: { discordUrl?: string; siteName?: string }) {
  const [world, setWorld] = useState<World>("overworld");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("blaze-world")) as World | null;
    if (stored) { setWorld(stored); document.documentElement.setAttribute("data-world", stored); }
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const flip = (w: World) => {
    setWorld(w);
    document.documentElement.setAttribute("data-world", w);
    try { localStorage.setItem("blaze-world", w); } catch {}
  };

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, backdropFilter: "blur(10px)", background: "rgba(16,12,10,.78)", borderBottom: "2px solid #000", boxShadow: "0 2px 0 var(--line)" }}>
      <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 68, gap: 14 }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "Anton", fontSize: "1.3rem", letterSpacing: ".03em" }}>
          <span style={{ width: 32, height: 32, background: "linear-gradient(135deg,var(--accent),var(--accent2))", border: "2px solid #000", boxShadow: "inset 0 2px 0 rgba(255,255,255,.3), inset 0 -3px 0 rgba(0,0,0,.5)", display: "inline-block" }} />
          {siteName}
        </Link>
        <div style={{ display: "flex", gap: 22, fontSize: ".95rem", fontWeight: 600 }} className="hidden md:flex">
          <Link to="/" activeProps={{ style: { color: "var(--highlight)" } }} style={{ color: "var(--ash)" }}>Home</Link>
          <Link to="/store" activeProps={{ style: { color: "var(--highlight)" } }} style={{ color: "var(--ash)" }}>Store</Link>
          <a href="/#announcements" style={{ color: "var(--ash)" }}>News</a>
          <a href="/#staff" style={{ color: "var(--ash)" }}>Staff</a>
          <a href="/#faq" style={{ color: "var(--ash)" }}>FAQ</a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 2, padding: 3, background: "var(--bg3)", border: "2px solid #000" }}>
            {(["overworld", "nether", "end"] as World[]).map((w) => (
              <button key={w} onClick={() => flip(w)} title={w}
                style={{ width: 26, height: 26, border: "none", cursor: "pointer", background: world === w ? "var(--accent)" : "transparent", color: world === w ? "#000" : "var(--ash)", fontFamily: "Press Start 2P", fontSize: ".55rem" }}>
                {w[0].toUpperCase()}
              </button>
            ))}
          </div>
          {signedIn ? (
            <Link to="/admin" className="mc-btn sm">Admin</Link>
          ) : null}
          {discordUrl ? <a href={discordUrl} target="_blank" rel="noopener" className="mc-btn primary sm">Discord</a> : null}
        </div>
      </div>
    </nav>
  );
}
