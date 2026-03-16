"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const GOOGLE_FONT =
  "https://fonts.googleapis.com/css2?family=Sora:wght@600;800&family=DM+Sans:wght@300;400;500&display=swap";

type Mode = "login" | "cadastro";

export default function PassageiroAuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [showPass, setShowPass] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const canSubmit = useMemo(() => {
    const e = email.trim();
    const s = senha.trim();
    if (mode === "cadastro") return nome.trim().length >= 2 && e.length >= 4 && s.length >= 4;
    return e.length >= 4 && s.length >= 4;
  }, [mode, nome, email, senha]);

  async function submit() {
    setMsg(null);

    const e = email.trim().toLowerCase();
    const s = senha.trim();
    const n = nome.trim();

    if (!canSubmit) {
      setMsg({ type: "err", text: "Campos inválidos." });
      return;
    }

    setLoading(true);
    try {
      if (mode === "cadastro") {
        const res = await fetch("/api/passageiros", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: n, email: e, senha: s }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setMsg({ type: "err", text: data?.error || "Falha ao cadastrar passageiro." });
          return;
        }

        localStorage.setItem("passageiroId", data.passageiro.id);
        router.push("/passageiro/home");
      } else {
        const res = await fetch("/api/passageiros/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: e, senha: s }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setMsg({ type: "err", text: data?.error || "Login falhou." });
          return;
        }

        localStorage.setItem("passageiroId", data.passageiro.id);
        router.push("/passageiro/home");
      }
    } catch {
      setMsg({ type: "err", text: "Erro de rede." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('${GOOGLE_FONT}');
        .font-display { font-family: 'Sora', sans-serif; }
        .font-body    { font-family: 'DM Sans', sans-serif; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 0; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #1a1f2e inset;
          -webkit-text-fill-color: #fff;
        }
      `}</style>

      <div className="min-h-screen w-full flex items-center justify-center font-body" style={{ background: "#0f1117" }}>
        <div className="w-full max-w-sm min-h-screen sm:min-h-0 sm:rounded-3xl overflow-hidden flex flex-col bg-[#111318]">
          <div
            className="flex flex-col items-center pt-16 pb-10 px-6"
            style={{ background: "linear-gradient(160deg, #1a1f2e 0%, #111318 100%)" }}
          >
            <div className="w-16 h-16 rounded-2xl bg-yellow-400 flex items-center justify-center shadow-lg shadow-yellow-400/25 mb-4">
              <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9">
                <path
                  d="M5.5 16.5a3 3 0 1 0 0 .01M18.5 16.5a3 3 0 1 0 0 .01"
                  stroke="#111"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M9 16.5h3.5l2.2-6.2H11L9.8 7.5H7.5"
                  stroke="#111"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14.5 10.3h3.2l1.6 2.2"
                  stroke="#111"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M7.2 7.5h2.6" stroke="#111" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            <h1 className="font-display font-bold text-white text-2xl tracking-wide">Chama-Moto</h1>
            <p className="text-gray-500 text-sm mt-1">A sua corrida, no seu ritmo</p>
          </div>

          <div className="flex mx-6 rounded-xl overflow-hidden border border-gray-800">
            {[
              { id: "login" as const, label: "Entrar" },
              { id: "cadastro" as const, label: "Cadastrar" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setMode(tab.id);
                  setMsg(null);
                }}
                className={`flex-1 py-3 text-sm font-medium font-body transition-colors ${
                  mode === tab.id
                    ? "bg-yellow-400 text-gray-900"
                    : "bg-[#1a1f2e] text-gray-400 hover:text-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {msg ? (
            <div
              className={`mx-6 mt-4 rounded-xl px-4 py-3 text-sm border ${
                msg.type === "ok"
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                  : "bg-red-500/10 text-red-300 border-red-500/20"
              }`}
            >
              {msg.text}
            </div>
          ) : null}

          <div className="flex flex-col gap-4 px-6 pt-6 pb-8">
            {mode === "cadastro" && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-body">Nome completo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Maria Antónia"
                  className="w-full bg-[#1a1f2e] border border-gray-700 focus:border-yellow-400 rounded-xl px-4 py-3.5 text-white text-sm font-body outline-none transition-colors placeholder:text-gray-600"
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-body">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                className="w-full bg-[#1a1f2e] border border-gray-700 focus:border-yellow-400 rounded-xl px-4 py-3.5 text-white text-sm font-body outline-none transition-colors placeholder:text-gray-600"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-body">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1a1f2e] border border-gray-700 focus:border-yellow-400 rounded-xl px-4 py-3.5 pr-12 text-white text-sm font-body outline-none transition-colors placeholder:text-gray-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-yellow-400 transition-colors"
                  aria-label="Mostrar/ocultar senha"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    {showPass ? (
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                    ) : (
                      <path d="M2 4.27L3.28 3 21 20.73 19.73 22l-3.01-3.01C15.24 19.63 13.67 20 12 20 7 20 2.73 16.89 1 12c.77-1.9 2.01-3.57 3.57-4.82L2 4.27z" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <button
              onClick={submit}
              disabled={loading || !canSubmit}
              className={`mt-1 w-full text-gray-900 font-display font-bold py-4 rounded-xl transition-all shadow-lg ${
                loading || !canSubmit
                  ? "bg-gray-700 text-gray-300 cursor-not-allowed shadow-none"
                  : "bg-yellow-400 hover:bg-yellow-300 active:scale-95 shadow-yellow-400/20"
              }`}
            >
              {loading ? "A processar..." : mode === "login" ? "Entrar" : "Criar Conta"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}