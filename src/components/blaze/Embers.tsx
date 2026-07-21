import { useEffect, useRef } from "react";

export function Embers() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current; if (!host) return;
    const N = 40;
    const nodes: HTMLDivElement[] = [];
    for (let i = 0; i < N; i++) {
      const e = document.createElement("div");
      e.className = "ember";
      e.style.left = Math.random() * 100 + "%";
      e.style.animationDuration = (6 + Math.random() * 10) + "s";
      e.style.animationDelay = (-Math.random() * 12) + "s";
      e.style.width = e.style.height = (2 + Math.random() * 3) + "px";
      e.style.opacity = String(0.4 + Math.random() * 0.6);
      host.appendChild(e); nodes.push(e);
    }
    return () => { nodes.forEach(n => n.remove()); };
  }, []);
  return <div ref={ref} aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }} />;
}
