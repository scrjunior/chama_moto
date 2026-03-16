import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const disponivelParam = url.searchParams.get("disponivel");

    const where: any =
      disponivelParam === "1" || disponivelParam === "true"
        ? { disponivel: true }
        : {};

    // ✅ Se pedir disponíveis, filtra GPS "fresco"
    if (where.disponivel === true) {
      const cutoff = new Date(Date.now() - 60_000); // 60s
      where.lastGpsAt = { gte: cutoff };
      where.lat = { not: null };
      where.lng = { not: null };
    }

    const taxistas = await prisma.taxista.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      include: { moto: true },
      take: 50,
    });

    return NextResponse.json({
      ok: true,
      taxistas: taxistas.map((t) => ({
        id: t.id,
        nome: t.nome,
        apelido: t.apelido,
        disponivel: t.disponivel,
        lat: t.lat,
        lng: t.lng,
        lastGpsAt: t.lastGpsAt,
        moto: t.moto ? { nomeMoto: t.moto.nomeMoto, matricula: t.moto.matricula } : null,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Erro ao listar taxistas." }, { status: 500 });
  }
}