import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ next: z.string().optional() }).parse,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        toast.success("Account created. Check your inbox if confirmation is required.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
      }
      navigate({ to: next || "/admin" });
    } catch (err: any) {
      toast.error(err.message ?? String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <form onSubmit={submit} className="pxcard" style={{ maxWidth: 420, width: "100%" }}>
        <div className="eyebrow">Access</div>
        <h1 className="display" style={{ fontSize: "2.4rem", color: "var(--highlight)", marginTop: 6 }}>{mode === "signin" ? "Sign in" : "Create account"}</h1>
        <p style={{ color: "var(--ash)", marginTop: 6, fontSize: ".9rem" }}>Admin & staff area.</p>
        <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
          <input className="field" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="field" type="password" required minLength={6} autoComplete="current-password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          <button className="mc-btn primary" style={{ justifyContent: "center" }} disabled={busy}>{busy ? "…" : mode === "signin" ? "Sign in" : "Sign up"}</button>
          <button type="button" className="mc-btn sm" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
          <a href="/" style={{ color: "var(--ash)", fontSize: ".85rem", textAlign: "center", marginTop: 8 }}>← Back to site</a>
        </div>
      </form>
    </div>
  );
}
