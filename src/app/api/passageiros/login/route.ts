import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const emailRaw = body?.email;
    const senhaRaw = body?.senha;

    const email = String(emailRaw ?? "").trim().toLowerCase();
    const senha = String(senhaRaw ?? "").trim();

    if (email.length < 4 || senha.length < 4) {
      return NextResponse.json(
        {
          error: "Campos inválidos.",
          debug: {
            emailReceivedType: typeof emailRaw,
            senhaReceivedType: typeof senhaRaw,
            emailLength: email.length,
            senhaLength: senha.length,
          },
        },
        { status: 400 }
      );
    }

    const passageiro = await prisma.passageiro.findUnique({ where: { email } });

    if (!passageiro || passageiro.senha !== senha) {
      return NextResponse.json({ error: "Credenciais incorretas." }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      passageiro: { id: passageiro.id, nome: passageiro.nome, email: passageiro.email },
    });
  } catch {
    return NextResponse.json({ error: "Erro no login." }, { status: 500 });
  }
}