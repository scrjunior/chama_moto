"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const GOOGLE_FONT =
  "https://fonts.googleapis.com/css2?family=Sora:wght@600;800&family=DM+Sans:wght@300;400;500&display=swap";

type TaxistaItem = {
  id: string;
  nome: string;
  apelido: string;
  disponivel?: boolean;
  lat?: number | null;
  lng?: number | null;
  moto: null | { nomeMoto: string; matricula: string };
};

const TaxistasMap = dynamic(() => import("@/components/passageiro/TaxistasMap"), {
  ssr: false,
});

export default function PassageiroHomePage() {
  const router = useRouter();

  const [passageiroNome, setPassageiroNome] = useState<string>("");
  const [taxistas, setTaxistas] = useState<TaxistaItem[]>([]);
  const [selectedTaxista, setSelectedTaxista] = useState<TaxistaItem | null>(null);

  const [origemTexto, setOrigemTexto] = useState("");
  const [destinoTexto, setDestinoTexto] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const canSend = useMemo(() => {
    return !!selectedTaxista && origemTexto.trim().length >= 2 && destinoTexto.trim().length >= 2;
  }, [selectedTaxista, origemTexto, destinoTexto]);

  function logout() {
    localStorage.removeItem("passageiroId");
    router.push("/");
  }

  async function carregarDados() {
    const pid = localStorage.getItem("passageiroId");
    if (!pid) {
      router.push("/");
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const [pRes, tRes] = await Promise.all([
        fetch(`/api/passageiros/${pid}`),
        fetch(`/api/taxistas?disponivel=1`),
      ]);

      const pData = await pRes.json().catch(() => null);
      const tData = await tRes.json().catch(() => null);

      if (pRes.ok) setPassageiroNome(pData?.passageiro?.nome || "");

      if (tRes.ok) {
        const list = (tData?.taxistas || []) as TaxistaItem[];
        setTaxistas(list);

        // se o selecionado sumiu (ficou indisponível), limpa seleção
        if (selectedTaxista && !list.find((x) => x.id === selectedTaxista.id)) {
          setSelectedTaxista(null);
        }
      } else {
        setTaxistas([]);
        setSelectedTaxista(null);
      }
    } catch {
      setMsg({ type: "err", text: "Erro de rede ao carregar dados." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const pid = localStorage.getItem("passageiroId");
    if (!pid) {
      router.push("/");
      return;
    }
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function solicitarViagem() {
    setMsg(null);

    if (!canSend || !selectedTaxista) {
      setMsg({ type: "err", text: "Selecione um taxista no mapa e preencha origem/destino." });
      return;
    }

    const passageiroId = localStorage.getItem("passageiroId");
    if (!passageiroId) {
      router.push("/");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/viagens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passageiroId,
          taxistaId: selectedTaxista.id,
          origemTexto,
          destinoTexto,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg({ type: "err", text: data?.error || "Falha ao solicitar viagem." });
        return;
      }

      setMsg({ type: "ok", text: "Viagem solicitada ✅ (pendente)" });
      setOrigemTexto("");
      setDestinoTexto("");
    } catch {
      setMsg({ type: "err", text: "Erro de rede ao solicitar." });
    } finally {
      setSending(false);
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
      `}</style>

      <div className="min-h-dvh w-full font-body bg-[#0f1117] text-white">
        <header className="sticky top-0 z-10 border-b border-gray-800 bg-[#111318]/90 backdrop-blur">
          <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <div className="font-display font-bold text-lg">
                {passageiroNome ? `Olá, ${passageiroNome.split(" ")[0]}` : "Passageiro"}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Selecione um taxista disponível</div>
            </div>

            <button
              onClick={logout}
              className="text-xs px-3 py-2 rounded-xl bg-[#1a1f2e] border border-gray-800 text-gray-200 hover:text-white hover:border-gray-700 transition-colors"
            >
              Sair
            </button>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-5 pb-10">
          {msg ? (
            <div
              className={`mb-4 rounded-xl px-4 py-3 text-sm border ${
                msg.type === "ok"
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                  : "bg-red-500/10 text-red-300 border-red-500/20"
              }`}
            >
              {msg.text}
            </div>
          ) : null}

          <section className="rounded-2xl border border-gray-800 bg-[#111318] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Nova Viagem</div>
                <div className="text-xs text-gray-500 mt-1">
                  Apenas taxistas “Disponíveis” aparecem no mapa.
                </div>
              </div>

              <button
                onClick={carregarDados}
                className="text-xs px-3 py-2 rounded-xl bg-[#1a1f2e] border border-gray-800 text-gray-200 hover:border-gray-700 transition-colors"
                disabled={loading}
              >
                {loading ? "A carregar..." : "Atualizar"}
              </button>
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="text-sm text-gray-300">A carregar mapa…</div>
              ) : taxistas.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-700 bg-[#0f1117] p-4">
                  <div className="text-sm font-semibold text-gray-200">Nenhum taxista disponível</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Quando um taxista clicar “Ficar disponível”, ele aparecerá aqui.
                  </div>
                </div>
              ) : (
                <TaxistasMap
                  taxistas={taxistas}
                  selectedId={selectedTaxista?.id || ""}
                  onSelect={(t: TaxistaItem) => {
                    setSelectedTaxista(t);
                    setMsg(null);
                  }}
                />
              )}
            </div>

            <div className="mt-4">
              {!selectedTaxista ? (
                <div className="rounded-xl border border-dashed border-gray-700 bg-[#0f1117] p-4">
                  <div className="text-sm font-semibold text-gray-200">Nenhum taxista selecionado</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Clique num marcador no mapa para selecionar um taxista.
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-800 bg-[#0f1117] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-100">
                        {selectedTaxista.nome} {selectedTaxista.apelido}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {selectedTaxista.moto
                          ? `${selectedTaxista.moto.nomeMoto} • ${selectedTaxista.moto.matricula}`
                          : "Sem moto"}
                      </div>
                    </div>

                    <span className="text-[11px] text-gray-400 border border-gray-800 rounded-full px-2 py-1">
                      Selecionado
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Origem</label>
                      <input
                        value={origemTexto}
                        onChange={(e) => setOrigemTexto(e.target.value)}
                        placeholder="Ex: Mercado Central"
                        className="mt-1 w-full bg-[#1a1f2e] border border-gray-700 focus:border-yellow-400 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-600"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-500">Destino</label>
                      <input
                        value={destinoTexto}
                        onChange={(e) => setDestinoTexto(e.target.value)}
                        placeholder="Ex: Universidade"
                        className="mt-1 w-full bg-[#1a1f2e] border border-gray-700 focus:border-yellow-400 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-gray-600"
                      />
                    </div>

                    <button
                      onClick={solicitarViagem}
                      disabled={sending || !canSend}
                      className={`mt-1 w-full font-display font-bold py-4 rounded-xl transition-all shadow-lg ${
                        sending || !canSend
                          ? "bg-gray-700 text-gray-300 cursor-not-allowed shadow-none"
                          : "bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-gray-900 shadow-yellow-400/20"
                      }`}
                    >
                      {sending ? "A solicitar..." : "Solicitar viagem"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}