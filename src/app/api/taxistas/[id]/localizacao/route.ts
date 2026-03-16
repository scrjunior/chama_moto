import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const taxistaId = String(id ?? "").trim();

    if (!taxistaId) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    const accuracy =
      body?.accuracy === undefined || body?.accuracy === null
        ? null
        : Number(body?.accuracy);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "lat/lng inválidos." }, { status: 400 });
    }

    const updated = await prisma.taxista.update({
      where: { id: taxistaId },
      data: {
        lat,
        lng,
        accuracy: accuracy ?? undefined,
        lastGpsAt: new Date(),
      },
      include: { moto: true },
    });

    return NextResponse.json({
      ok: true,
      taxista: {
        id: updated.id,
        nome: updated.nome,
        apelido: updated.apelido,
        disponivel: updated.disponivel,
        lat: updated.lat,
        lng: updated.lng,
        accuracy: updated.accuracy,
        lastGpsAt: updated.lastGpsAt,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao atualizar localização." },
      { status: 500 }
    );
  }
}