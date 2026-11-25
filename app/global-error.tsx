"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f1f5f9", padding: 24 }}>
        <div style={{ maxWidth: 480, margin: "60px auto", background: "#fff", borderRadius: 12, padding: 24, border: "1px solid #e2e8f0" }}>
          <h1 style={{ color: "#152a4b", fontSize: 20, margin: 0 }}>SISCOF: erro ao carregar</h1>
          <p style={{ color: "#475569", fontSize: 14 }}>
            Abra <a href="/login">a tela de login</a>: se houver configuração faltando na Vercel ou no Supabase, ela mostra o que é.
          </p>
          {error.digest && <p style={{ color: "#94a3b8", fontSize: 12, fontFamily: "monospace" }}>Código: {error.digest}</p>}
          <button onClick={reset} style={{ background: "#152a4b", color: "#fff", border: 0, borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
