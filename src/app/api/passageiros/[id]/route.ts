import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const passageiroId = String(id ?? "").trim();

    if (!passageiroId) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const passageiro = await prisma.passageiro.findUnique({ where: { id: passageiroId } });
    if (!passageiro) {
      return NextResponse.json({ error: "Passageiro não encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      passageiro: {
        id: passageiro.id,
        nome: passageiro.nome,
        email: passageiro.email,
        criadoEm: passageiro.criadoEm,
      },
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar passageiro." }, { status: 500 });
  }
}