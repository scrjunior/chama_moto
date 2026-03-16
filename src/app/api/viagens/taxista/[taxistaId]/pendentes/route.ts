import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  context: { params: Promise<{ taxistaId: string }> }
) {
  try {
    const { taxistaId } = await context.params;
    const id = String(taxistaId ?? "").trim();

    if (!id) {
      return NextResponse.json({ error: "taxistaId inválido." }, { status: 400 });
    }

    const viagens = await prisma.viagem.findMany({
      where: { taxistaId: id, status: "PENDENTE" },
      orderBy: { criadoEm: "desc" },
      include: {
        passageiro: { select: { id: true, nome: true, email: true } },
      },
      take: 50,
    });

    return NextResponse.json({
      ok: true,
      viagens: viagens.map((v) => ({
        id: v.id,
        status: v.status,
        origemTexto: v.origemTexto,
        destinoTexto: v.destinoTexto,
        criadoEm: v.criadoEm,
        passageiro: v.passageiro,
        taxistaId: v.taxistaId,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao buscar viagens pendentes." },
      { status: 500 }
    );
  }
}