import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = String(body?.email ?? "").trim().toLowerCase();
    const senha = String(body?.senha ?? "").trim();

    if (email.length < 4 || senha.length < 4) {
      return NextResponse.json({ error: "Email ou senha inválidos." }, { status: 400 });
    }

    const taxista = await prisma.taxista.findUnique({
      where: { email },
      include: { moto: true },
    });

    if (!taxista || taxista.senha !== senha) {
      return NextResponse.json({ error: "Credenciais incorretas." }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      taxista: {
        id: taxista.id,
        nome: taxista.nome,
        apelido: taxista.apelido,
        email: taxista.email,
        moto: taxista.moto
          ? { nomeMoto: taxista.moto.nomeMoto, matricula: taxista.moto.matricula }
          : null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Erro no login." }, { status: 500 });
  }
}