"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const GOOGLE_FONT =
  "https://fonts.googleapis.com/css2?family=Sora:wght@600;800&family=DM+Sans:wght@300;400;500&display=swap";

type TaxistaData = {
  id: string;
  nome: string;
  apelido: string;
  email: string;
  documento: string;
  criadoEm: string;
  moto: null | {
    id: string;
    nomeMoto: string;
    matricula: string;
  };
};

export default function TaxistaContaPage() {
  const router = useRouter();

  const [taxista, setTaxista] = useState<TaxistaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const nomeCompleto = useMemo(() => {
    if (!taxista) return "";
    return `${taxista.nome} ${taxista.apelido}`.trim();
  }, [taxista]);

  async function loadTaxista() {
    setLoading(true);
    setErr(null);

    const id = localStorage.getItem("taxistaId");
    if (!id) {
      setLoading(false);
      router.push("/taxista");
      return;
    }

    try {
      const res = await fetch(`/api/taxistas/${id}`, { method: "GET" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setTaxista(null);
        setErr(data?.error || "Falha ao buscar dados do taxista.");
        return;
      }

      setTaxista(data.taxista);
    } catch {
      setTaxista(null);
      setErr("Erro de rede ao buscar dados.");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("taxistaId");
    router.push("/taxista");
  }

  useEffect(() => {
    const id = localStorage.getItem("taxistaId");
    if (!id) {
      router.push("/taxista");
      return;
    }
    loadTaxista();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <style>{`
        @import url('${GOOGLE_FONT}');
        .font-display { font-family: 'Sora', sans-serif; }
        .font-body    { font-family: 'DM Sans', sans-serif; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 0; }
      `}</style>

      <div className="min-h-dvh w-full font-body bg-[#0f1117] text-white">
        {/* Top bar */}
        <header className="sticky top-0 z-10 border-b border-gray-800 bg-[#111318]/90 backdrop-blur">
          <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <div className="font-display font-bold text-lg">Conta</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Seus dados e dados da moto
              </div>
            </div>

            <button
              onClick={() => router.push("/taxista/home")}
              className="text-xs px-3 py-2 rounded-xl bg-[#1a1f2e] border border-gray-800 text-gray-200 hover:text-white hover:border-gray-700 transition-colors"
              title="Voltar"
            >
              Voltar
            </button>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-5 pb-28">
          <section className="rounded-2xl border border-gray-800 bg-[#111318] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Meu Perfil</div>
                
              </div>

              <button
                onClick={loadTaxista}
                className="text-xs px-3 py-2 rounded-xl bg-[#1a1f2e] border border-gray-800 text-gray-200 hover:border-gray-700 transition-colors"
              >
                Atualizar
              </button>
            </div>

            {loading ? (
              <div className="mt-4 text-sm text-gray-300">A carregar dados…</div>
            ) : err ? (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {err}
              </div>
            ) : taxista ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-gray-800 bg-[#0f1117] p-3">
                  <div className="text-xs text-gray-500">Nome</div>
                  <div className="text-sm font-semibold text-gray-100">{nomeCompleto}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-800 bg-[#0f1117] p-3">
                    <div className="text-xs text-gray-500">Email</div>
                    <div className="text-sm font-semibold text-gray-100 truncate">
                      {taxista.email}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-800 bg-[#0f1117] p-3">
                    <div className="text-xs text-gray-500">Documento</div>
                    <div className="text-sm font-semibold text-gray-100 truncate">
                      {taxista.documento}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-800 bg-[#0f1117] p-4">
                  <div className="text-sm font-semibold text-white mb-2">Moto</div>
                  {taxista.moto ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-gray-800 bg-[#111318] p-3">
                        <div className="text-xs text-gray-500">Nome</div>
                        <div className="text-sm font-semibold text-gray-100">
                          {taxista.moto.nomeMoto}
                        </div>
                      </div>
                      <div className="rounded-xl border border-gray-800 bg-[#111318] p-3">
                        <div className="text-xs text-gray-500">Matrícula</div>
                        <div className="text-sm font-semibold text-gray-100">
                          {taxista.moto.matricula}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">Sem moto associada.</div>
                  )}
                </div>

                <button
                  onClick={logout}
                  className="w-full rounded-xl py-3 text-sm font-semibold bg-red-500/15 border border-red-500/20 text-red-300 hover:bg-red-500/20 transition-colors"
                >
                  Sair
                </button>

                
              </div>
            ) : null}
          </section>
        </main>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-800 bg-[#111318]/95 backdrop-blur">
          <div className="max-w-md mx-auto px-4 py-3 grid grid-cols-3 gap-2 text-xs">
            <button
              className="rounded-xl py-2 bg-[#1a1f2e] border border-gray-800 text-gray-200 hover:border-gray-700 transition-colors"
              onClick={() => router.push("/taxista/home")}
            >
              Home
            </button>

            <button
              className="rounded-xl py-2 bg-[#1a1f2e] border border-gray-800 text-gray-200 hover:border-gray-700 transition-colors"
              onClick={() => alert("Em breve: chamadas")}
            >
              Chamadas
            </button>

            <button className="rounded-xl py-2 bg-yellow-400 text-gray-900 font-semibold">
              Conta
            </button>
          </div>
        </nav>
      </div>
    </>
  );
}