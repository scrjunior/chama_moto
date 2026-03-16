import { NextResponse } from "next/server";

// ⚠️ DEMO: em produção guarda numa BD (Mongo/Postgres etc).
// Aqui vamos guardar em memória (vai perder quando reiniciar o servidor).
declare global {
  // eslint-disable-next-line no-var
  var __pushSubs: Map<string, any> | undefined;
}
const store = globalThis.__pushSubs ?? new Map<string, any>();
globalThis.__pushSubs = store;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { taxistaId, subscription } = body || {};

    if (!taxistaId || !subscription) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    store.set(String(taxistaId), subscription);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao salvar subscription" }, { status: 500 });
  }
}

// Endpoint de debug (opcional)
export async function GET() {
  return NextResponse.json({ count: store.size });
}