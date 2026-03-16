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
    const disponivel = body?.disponivel;

    if (typeof disponivel !== "boolean") {
      return NextResponse.json(
        { error: "Campo 'disponivel' deve ser boolean." },
        { status: 400 }
      );
    }

    const updated = await prisma.taxista.update({
      where: { id: taxistaId },
      data: { disponivel },
      include: { moto: true },
    });

    return NextResponse.json({
      ok: true,
      taxista: {
        id: updated.id,
        nome: updated.nome,
        apelido: updated.apelido,
        email: updated.email,
        disponivel: updated.disponivel,
        moto: updated.moto
          ? { nomeMoto: updated.moto.nomeMoto, matricula: updated.moto.matricula }
          : null,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao atualizar disponibilidade." },
      { status: 500 }
    );
  }
}