import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const nome = String(body?.nome ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const senha = String(body?.senha ?? "").trim();

    if (nome.length < 2 || email.length < 4 || senha.length < 4) {
      return NextResponse.json({ error: "Campos inválidos." }, { status: 400 });
    }

    const created = await prisma.passageiro.create({
      data: { nome, email, senha }, // MVP: senha simples
    });

    return NextResponse.json(
      {
        ok: true,
        passageiro: {
          id: created.id,
          nome: created.nome,
          email: created.email,
          criadoEm: created.criadoEm,
        },
      },
      { status: 201 }
    );
  } catch (error) {
  // Expose the hidden cause
  const cause = (error as any)?.cause;
  console.error("ERRO AO CADASTRAR PASSAGEIRO:", error);
  console.error("CAUSA REAL:", cause);
  console.error("CAUSA DETALHADA:", JSON.stringify(cause, Object.getOwnPropertyNames(cause ?? {})));

  return NextResponse.json(
    {
      error: "Não foi possível cadastrar passageiro.",
      detalhe: error instanceof Error ? error.message : String(error),
      causa: cause ? String(cause) : undefined,
    },
    { status: 500 }
  );
}
}