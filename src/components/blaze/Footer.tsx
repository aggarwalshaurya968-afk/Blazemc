export function Footer({ settings }: { settings: Record<string, any> }) {
  const social = settings.social ?? {};
  const server = settings.server ?? {};
  const brand = settings.branding ?? {};
  return (
    <footer style={{ position: "relative", zIndex: 2, borderTop: "2px solid #000", background: "var(--bg2)", marginTop: 60, padding: "50px 0 30px" }}>
      <div className="wrap" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 30 }}>
        <div>
          <div style={{ fontFamily: "Anton", fontSize: "1.6rem", color: "var(--highlight)" }}>{brand.siteName ?? "BLAZEMC"}</div>
          <p style={{ color: "var(--ash)", marginTop: 8, fontSize: ".9rem" }}>{brand.tagline}</p>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Connect</div>
          {server.javaIp && <div style={{ fontFamily: "Share Tech Mono", color: "var(--highlight)" }}>{server.javaIp}</div>}
          {server.bedrockIp && <div style={{ fontFamily: "Share Tech Mono", color: "var(--ash)", fontSize: ".85rem" }}>Bedrock: {server.bedrockIp}</div>}
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Community</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {social.discord && <a href={social.discord} target="_blank" rel="noopener" style={{ color: "var(--ash)" }}>Discord</a>}
            {social.youtube && <a href={social.youtube} target="_blank" rel="noopener" style={{ color: "var(--ash)" }}>YouTube</a>}
            {social.instagram && <a href={social.instagram} target="_blank" rel="noopener" style={{ color: "var(--ash)" }}>Instagram</a>}
            {social.twitter && <a href={social.twitter} target="_blank" rel="noopener" style={{ color: "var(--ash)" }}>Twitter</a>}
          </div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Legal</div>
          <div style={{ color: "var(--ash)", fontSize: ".85rem" }}>Not affiliated with Mojang or Microsoft. Minecraft is a trademark of Mojang AB.</div>
        </div>
      </div>
      <div className="wrap" style={{ marginTop: 30, paddingTop: 20, borderTop: "1px solid var(--line)", color: "var(--ash)", fontSize: ".8rem", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <span>© {new Date().getFullYear()} {brand.siteName ?? "BlazeMC"}. All rights reserved.</span>
        <span className="pixel">POWERED BY FIRE</span>
      </div>
    </footer>
  );
}
