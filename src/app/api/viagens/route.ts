import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import webpush from "web-push";

// ===== STORE TEMPORÁRIA (para teste) =====
declare global {
  // eslint-disable-next-line no-var
  var __pushSubs: Map<string, any> | undefined;
}

const store = globalThis.__pushSubs ?? new Map<string, any>();
globalThis.__pushSubs = store;

// ===== CONFIGURAR VAPID =====
if (
  process.env.VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_SUBJECT
) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const passageiroId = String(body?.passageiroId ?? "").trim();
    const taxistaId = String(body?.taxistaId ?? "").trim();
    const origemTexto = String(body?.origemTexto ?? "").trim();
    const destinoTexto = String(body?.destinoTexto ?? "").trim();

    if (!passageiroId || !taxistaId || origemTexto.length < 2 || destinoTexto.length < 2) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    // Verificar se existem
    const [p, t] = await Promise.all([
      prisma.passageiro.findUnique({ where: { id: passageiroId } }),
      prisma.taxista.findUnique({ where: { id: taxistaId } }),
    ]);

    if (!p) return NextResponse.json({ error: "Passageiro não encontrado." }, { status: 404 });
    if (!t) return NextResponse.json({ error: "Taxista não encontrado." }, { status: 404 });

    // Criar viagem
    const viagem = await prisma.viagem.create({
      data: {
        passageiroId,
        taxistaId,
        origemTexto,
        destinoTexto,
        status: "PENDENTE",
      },
    });

    // ===============================
    // 🔔 ENVIAR PUSH PARA O TAXISTA
    // ===============================
    const subscription = store.get(taxistaId);

    if (subscription) {
      const payload = {
        title: "Nova chamada!",
        body: `Nova viagem: ${origemTexto} → ${destinoTexto}`,
        url: "/taxista/home",
      };

      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
      } catch (e: any) {
        const statusCode = e?.statusCode;

        // Se subscription expirou
        if (statusCode === 404 || statusCode === 410) {
          store.delete(taxistaId);
        }
      }
    }

    return NextResponse.json({ ok: true, viagem }, { status: 201 });

  } catch {
    return NextResponse.json({ error: "Erro ao solicitar viagem." }, { status: 500 });
  }
}