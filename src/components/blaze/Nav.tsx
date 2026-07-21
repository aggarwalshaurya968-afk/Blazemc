import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_DISCORD_URL = "https://discord.gg/7AsNnQd9Mk";

export function Nav({ discordUrl, siteName = "BLAZEMC" }: { discordUrl?: string; siteName?: string }) {
  const [signedIn, setSignedIn] = useState(false);
  const discord = discordUrl ?? DEFAULT_DISCORD_URL;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => { sub.subscription.unsubscribe(); };
  }, []);

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
          {signedIn ? (
            <Link to="/admin" className="mc-btn sm">Admin</Link>
          ) : null}
          <a href={discord} target="_blank" rel="noopener" className="mc-btn primary sm">Discord</a>
        </div>
      </div>
    </nav>
  );
}
