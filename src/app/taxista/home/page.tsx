"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const GOOGLE_FONT =
  "https://fonts.googleapis.com/css2?family=Sora:wght@600;800&family=DM+Sans:wght@300;400;500&display=swap";

type Status = "disponivel" | "indisponivel";

type ViagemItem = {
  id: string;
  status: "PENDENTE" | "ACEITA" | "REJEITADA" | "CONCLUIDA" | "CANCELADA";
  origemTexto: string;
  destinoTexto: string;
  criadoEm: string;
  passageiro: { id: string; nome: string; email: string };
  taxistaId: string;
};

type TaxistaLite = {
  id: string;
  nome: string;
  apelido: string;
  email: string;
  disponivel?: boolean;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function TaxistaHomePage() {
  const router = useRouter();

  const [status, setStatus] = useState<Status>("indisponivel");
  const [taxista, setTaxista] = useState<TaxistaLite | null>(null);

  const [viagens, setViagens] = useState<ViagemItem[]>([]);
  const [loadingChamadas, setLoadingChamadas] = useState(false);
  const [errChamadas, setErrChamadas] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  // Notificação / detetor de "novas viagens"
  const [newCallCount, setNewCallCount] = useState(0);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);

  // Áudio com ficheiro
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);

  // Evitar spam de notification (só dispara quando detecta ids novos)
  const lastNotifiedAtRef = useRef<number>(0);

  // ✅ GPS do taxista (watchPosition)
  const gpsWatchIdRef = useRef<number | null>(null);
  const lastGpsSentAtRef = useRef<number>(0);

  // Push status (opcional para debug)
  const [pushReady, setPushReady] = useState(false);

  const primeiroNome = useMemo(() => {
    if (!taxista?.nome) return "";
    return taxista.nome.split(" ")[0];
  }, [taxista]);

  function logout() {
    localStorage.removeItem("taxistaId");
    router.push("/taxista");
  }

  // ✅ Enviar localização atual ao servidor
  async function enviarLocalizacao(lat: number, lng: number, accuracy?: number | null) {
    const id = localStorage.getItem("taxistaId");
    if (!id) return;

    await fetch(`/api/taxistas/${id}/localizacao`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, accuracy }),
    }).catch(() => {});
  }

  function pararGps() {
    if (gpsWatchIdRef.current != null) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      gpsWatchIdRef.current = null;
    }
  }

  function iniciarGps() {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    alert("Este dispositivo/navegador não suporta GPS.");
    return;
  }

  // Primeiro pede 1 posição. Se negar, não tenta watchPosition.
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      enviarLocalizacao(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy).catch(() => {});

      // Só depois de ter permissão, começa o watch
      gpsWatchIdRef.current = navigator.geolocation.watchPosition(
        (p) => {
          const now = Date.now();
          if (now - lastGpsSentAtRef.current < 5000) return;
          lastGpsSentAtRef.current = now;

          enviarLocalizacao(p.coords.latitude, p.coords.longitude, p.coords.accuracy).catch(() => {});
        },
        (err) => {
          alert("Erro GPS: " + err.message);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 2000 }
      );
    },
    (err) => {
      // ✅ Uma mensagem só (e com instrução)
      alert(
        "A localização foi bloqueada.\n\n" +
          "No Chrome: toque no cadeado (ao lado do link) → Permissões do site → Localização → Permitir.\n" +
          "Depois recarregue a página."
      );
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

  function tocarSomChamada() {
    const a = audioRef.current;
    if (!a) return;

    // se o browser ainda não liberou áudio, não toca
    if (!audioUnlockedRef.current) return;

    try {
      a.pause();
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof (p as any).catch === "function") (p as any).catch(() => {});
    } catch {
      // silêncio
    }
  }

  function vibrar() {
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        (navigator as any).vibrate?.(200);
      }
    } catch {
      // silêncio
    }
  }

  function notificarSistema(qtd: number) {
    try {
      if (typeof window === "undefined") return;
      if (!("Notification" in window)) return;
      if (Notification.permission !== "granted") return;

      // anti-spam: no máximo 1 notificação por ~2s
      const now = Date.now();
      if (now - lastNotifiedAtRef.current < 2000) return;
      lastNotifiedAtRef.current = now;

      const titulo = "Nova chamada!";
      const body = qtd === 1 ? "Você recebeu 1 solicitação." : `Você recebeu ${qtd} solicitações.`;

      new Notification(titulo, {
        body,
        // icon: "/icon.png",
        // badge: "/icon.png",
      });

      vibrar();
    } catch {
      // silêncio
    }
  }

  async function registrarPushParaTaxista() {
    try {
      if (typeof window === "undefined") return;

      const taxistaId = localStorage.getItem("taxistaId");
      if (!taxistaId) return;

      const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!pub) {
        console.warn("NEXT_PUBLIC_VAPID_PUBLIC_KEY não definido");
        return;
      }

      if (!("serviceWorker" in navigator)) return;
      if (!("PushManager" in window)) return;

      // Registra o SW
      const reg = await navigator.serviceWorker.register("/sw.js");

      // Permissão de notificação
      const perm = await Notification.requestPermission().catch(() => "default" as NotificationPermission);
      if (perm !== "granted") return;

      // Subscription
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(pub),
        }));

      // Envia para o backend guardar
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taxistaId, subscription: sub }),
      });

      setPushReady(true);
    } catch {
      // silêncio
    }
  }

  // Preparar áudio + unlock (necessário pelo browser) + pedir permissão de notificação + setup push
  useEffect(() => {
    // Caminho do ficheiro em /public
    audioRef.current = new Audio("/sounds/chamada.wav");
    audioRef.current.preload = "auto";
    audioRef.current.volume = 1.0;

    const unlock = () => {
      audioUnlockedRef.current = true;

      // pede permissão para notificação
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "default") {
          Notification.requestPermission().catch(() => {});
        }
      }

      // tenta "desbloquear" o áudio (tocar mudo e parar)
      const a = audioRef.current;
      if (a) {
        a.muted = true;
        a.play()
          .then(() => {
            a.pause();
            a.currentTime = 0;
            a.muted = false;
          })
          .catch(() => {
            a.muted = false;
          });
      }

      // ✅ Após o primeiro gesto do utilizador, registra push (melhor compatibilidade)
      registrarPushParaTaxista().catch(() => {});

      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("keydown", unlock);
    };

    window.addEventListener("click", unlock);
    window.addEventListener("touchstart", unlock);
    window.addEventListener("keydown", unlock);

    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("keydown", unlock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarChamadas(opts?: { silent?: boolean }) {
    if (!opts?.silent) setErrChamadas(null);

    const id = localStorage.getItem("taxistaId");
    if (!id) {
      router.push("/taxista");
      return;
    }

    if (!opts?.silent) setLoadingChamadas(true);

    try {
      const res = await fetch(`/api/viagens/taxista/${id}/pendentes`, { method: "GET" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (!opts?.silent) setErrChamadas(data?.error || "Falha ao carregar chamadas.");
        if (!opts?.silent) setViagens([]);
        return;
      }

      const list = (data?.viagens || []) as ViagemItem[];

      // Detectar novas viagens (após o primeiro carregamento)
      const newIds = new Set(list.map((v) => v.id));
      const prevIds = prevIdsRef.current;

      if (initialLoadDoneRef.current) {
        let added = 0;
        for (const vid of newIds) if (!prevIds.has(vid)) added++;

        if (added > 0) {
          setNewCallCount((c) => c + added);

          // 1) tentar tocar som (se estiver desbloqueado)
          tocarSomChamada();

          // 2) notificação do sistema (quando está aberto)
          notificarSistema(added);
        }
      } else {
        initialLoadDoneRef.current = true;
      }

      prevIdsRef.current = newIds;
      setViagens(list);
    } catch {
      if (!opts?.silent) {
        setErrChamadas("Erro de rede ao carregar chamadas.");
        setViagens([]);
      }
    } finally {
      if (!opts?.silent) setLoadingChamadas(false);
    }
  }

  async function responderViagem(viagemId: string, novoStatus: "ACEITA" | "REJEITADA") {
    const id = localStorage.getItem("taxistaId");
    if (!id) {
      router.push("/taxista");
      return;
    }

    setActionId(viagemId);
    try {
      const res = await fetch(`/api/viagens/${viagemId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taxistaId: id, status: novoStatus }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || "Falha ao atualizar status.");
        return;
      }

      // Remove da lista (já não é pendente)
      setViagens((prev) => prev.filter((v) => v.id !== viagemId));

      // Atualiza cache de ids (para não considerar como "nova" depois)
      prevIdsRef.current = new Set(viagens.filter((v) => v.id !== viagemId).map((v) => v.id));
    } catch {
      alert("Erro de rede ao atualizar status.");
    } finally {
      setActionId(null);
    }
  }

  async function definirDisponibilidade(novo: Status) {
    const id = localStorage.getItem("taxistaId");
    if (!id) {
      router.push("/taxista");
      return;
    }

    setSavingStatus(true);
    try {
      const res = await fetch(`/api/taxistas/${id}/disponibilidade`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disponivel: novo === "disponivel" }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || "Falha ao atualizar disponibilidade.");
        return;
      }

      setStatus(data?.taxista?.disponivel ? "disponivel" : "indisponivel");
      setTaxista((prev) => (prev ? { ...prev, disponivel: !!data?.taxista?.disponivel } : prev));
    } catch {
      alert("Erro de rede ao atualizar disponibilidade.");
    } finally {
      setSavingStatus(false);
    }
  }

  // Carregar taxista + chamadas iniciais
  useEffect(() => {
    const id = localStorage.getItem("taxistaId");
    if (!id) {
      router.push("/taxista");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/taxistas/${id}`, { method: "GET" });
        const data = await res.json().catch(() => null);
        if (!res.ok) return;

        setTaxista({
          id: data.taxista.id,
          nome: data.taxista.nome,
          apelido: data.taxista.apelido,
          email: data.taxista.email,
          disponivel: data.taxista.disponivel,
        });

        setStatus(data.taxista.disponivel ? "disponivel" : "indisponivel");
      } catch {
        // silêncio
      }
    })();

    carregarChamadas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ GPS liga/desliga conforme o status
  useEffect(() => {
    if (status === "disponivel") iniciarGps();
    else pararGps();

    return () => {
      pararGps();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Polling — a cada 1 segundo, mas só se estiver disponível
  useEffect(() => {
    if (status !== "disponivel") return;

    const t = setInterval(() => {
      carregarChamadas({ silent: true });
    }, 1000);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Título do browser
  useEffect(() => {
    const base = "Taxista • Chama-Moto";
    if (newCallCount > 0) document.title = `(${newCallCount}) Nova chamada • Chama-Moto`;
    else document.title = base;

    return () => {
      document.title = base;
    };
  }, [newCallCount]);

  async function testarPush() {
    try {
      const id = localStorage.getItem("taxistaId");
      if (!id) return alert("taxistaId não encontrado");
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taxistaId: id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return alert(data?.error || "Falha ao testar push");
      alert("Push enviado! (se estiver no Android, minimiza o Chrome e testa)");
    } catch {
      alert("Falha ao testar push");
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
                {primeiroNome ? `Olá, ${primeiroNome}` : "Área do Taxista"}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {status === "disponivel" ? "Você está disponível" : "Você está indisponível"}
              </div>
            </div>

            <button
              onClick={logout}
              className="text-xs px-3 py-2 rounded-xl bg-[#1a1f2e] border border-gray-800 text-gray-200 hover:text-white hover:border-gray-700 transition-colors"
              title="Sair"
            >
              Sair
            </button>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-5 pb-28">
          {newCallCount > 0 ? (
            <div className="mb-4 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-yellow-300">
                    Nova chamada recebida ({newCallCount})
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">Verifique a seção “Chamadas”.</div>
                </div>
                <button
                  onClick={() => setNewCallCount(0)}
                  className="text-xs px-3 py-2 rounded-xl bg-[#1a1f2e] border border-gray-800 text-gray-200 hover:border-gray-700 transition-colors"
                >
                  Ok
                </button>
              </div>
            </div>
          ) : null}

          {/* Status card */}
          <section className="rounded-2xl border border-gray-800 bg-[#111318] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Status</div>
              </div>

              <div
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  status === "disponivel"
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                    : "bg-gray-500/10 text-gray-300 border-gray-500/20"
                }`}
              >
                {status === "disponivel" ? "Disponível" : "Indisponível"}
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => definirDisponibilidade("disponivel")}
                disabled={savingStatus}
                className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all border ${
                  status === "disponivel"
                    ? "bg-yellow-400 text-gray-900 border-yellow-400"
                    : "bg-[#1a1f2e] text-gray-200 border-gray-800 hover:border-gray-700"
                } ${savingStatus ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {savingStatus ? "A guardar..." : "Ficar disponível"}
              </button>

              <button
                onClick={() => definirDisponibilidade("indisponivel")}
                disabled={savingStatus}
                className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all border ${
                  status === "indisponivel"
                    ? "bg-gray-700 text-white border-gray-700"
                    : "bg-[#1a1f2e] text-gray-200 border-gray-800 hover:border-gray-700"
                } ${savingStatus ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {savingStatus ? "A guardar..." : "Parar"}
              </button>
            </div>
          </section>

          {/* Chamadas */}
          <section className="mt-4 rounded-2xl border border-gray-800 bg-[#111318] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Chamadas</div>
                <div className="text-xs text-gray-500 mt-1">Solicitações pendentes para você.</div>
              </div>

              <button
                onClick={() => {
                  setNewCallCount(0);
                  carregarChamadas();
                }}
                className="text-xs px-3 py-2 rounded-xl bg-[#1a1f2e] border border-gray-800 text-gray-200 hover:border-gray-700 transition-colors"
                disabled={loadingChamadas}
              >
                {loadingChamadas ? "Atualizando..." : "Atualizar"}
              </button>
            </div>

            {errChamadas ? (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {errChamadas}
              </div>
            ) : null}

            {loadingChamadas ? (
              <div className="mt-4 text-sm text-gray-300">A carregar chamadas…</div>
            ) : viagens.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-gray-700 bg-[#0f1117] p-4">
                <div className="text-sm font-semibold text-gray-200">Nenhuma chamada pendente</div>
                <div className="text-xs text-gray-500 mt-1">Quando um passageiro solicitar, aparecerá aqui.</div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {viagens.map((v) => (
                  <div key={v.id} className="rounded-2xl border border-gray-800 bg-[#0f1117] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-100">{v.passageiro?.nome || "Passageiro"}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{new Date(v.criadoEm).toLocaleString()}</div>
                      </div>

                      <span className="text-[11px] text-gray-400 border border-gray-800 rounded-full px-2 py-1">
                        PENDENTE
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <div className="rounded-xl border border-gray-800 bg-[#111318] p-3">
                        <div className="text-xs text-gray-500">Origem</div>
                        <div className="text-sm font-semibold text-gray-100">{v.origemTexto}</div>
                      </div>
                      <div className="rounded-xl border border-gray-800 bg-[#111318] p-3">
                        <div className="text-xs text-gray-500">Destino</div>
                        <div className="text-sm font-semibold text-gray-100">{v.destinoTexto}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-3">
                      <button
                        onClick={() => responderViagem(v.id, "REJEITADA")}
                        disabled={actionId === v.id}
                        className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all border ${
                          actionId === v.id
                            ? "bg-gray-700 text-gray-300 border-gray-700 cursor-not-allowed"
                            : "bg-red-500/15 text-red-300 border-red-500/20 hover:bg-red-500/20"
                        }`}
                      >
                        Rejeitar
                      </button>

                      <button
                        onClick={() => responderViagem(v.id, "ACEITA")}
                        disabled={actionId === v.id}
                        className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all border ${
                          actionId === v.id
                            ? "bg-gray-700 text-gray-300 border-gray-700 cursor-not-allowed"
                            : "bg-yellow-400 text-gray-900 border-yellow-400 hover:bg-yellow-300"
                        }`}
                      >
                        Aceitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Debug opcional: botão para testar push */}
          {/* <button onClick={testarPush} className="mt-4 text-xs px-3 py-2 rounded-xl bg-[#1a1f2e] border border-gray-800">
            Testar Push {pushReady ? "✅" : "…"}
          </button> */}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-800 bg-[#111318]/95 backdrop-blur">
          <div className="max-w-md mx-auto px-4 py-3 grid grid-cols-3 gap-2 text-xs">
            <button className="rounded-xl py-2 bg-yellow-400 text-gray-900 font-semibold">Home</button>

            <button
              className="rounded-xl py-2 bg-[#1a1f2e] border border-gray-800 text-gray-200 hover:border-gray-700 transition-colors"
              onClick={() => alert("Em breve: chamadas em tempo real")}
            >
              Chamadas
            </button>

            <button
              className="rounded-xl py-2 bg-[#1a1f2e] border border-gray-800 text-gray-200 hover:border-gray-700 transition-colors"
              onClick={() => router.push("/taxista/conta")}
            >
              Conta
            </button>
          </div>
        </nav>
      </div>
    </>
  );
}