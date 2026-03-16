import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const disponivelParam = url.searchParams.get("disponivel");

    const where =
      disponivelParam === "1" || disponivelParam === "true"
        ? { disponivel: true }
        : {};

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
        moto: t.moto ? { nomeMoto: t.moto.nomeMoto, matricula: t.moto.matricula } : null,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Erro ao listar taxistas." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const nome = String(body?.nome ?? "").trim();
    const apelido = String(body?.apelido ?? "").trim();
    const documento = String(body?.documento ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const senha = String(body?.senha ?? "").trim();

    const nomeMoto = String(body?.moto?.nomeMoto ?? "").trim();
    const matricula = String(body?.moto?.matricula ?? "").trim();

    if (
      nome.length < 2 ||
      apelido.length < 2 ||
      documento.length < 3 ||
      email.length < 4 ||
      senha.length < 4 ||
      nomeMoto.length < 2 ||
      matricula.length < 3
    ) {
      return NextResponse.json(
        { error: "Campos inválidos. Preencha todos os dados corretamente." },
        { status: 400 }
      );
    }

    const created = await prisma.taxista.create({
      data: {
        nome,
        apelido,
        documento,
        email,
        senha,
        // disponivel default false
        moto: { create: { nomeMoto, matricula } },
      },
      include: { moto: true },
    });

    return NextResponse.json(
      {
        ok: true,
        taxista: {
          id: created.id,
          nome: created.nome,
          apelido: created.apelido,
          email: created.email,
          documento: created.documento,
          disponivel: created.disponivel,
          criadoEm: created.criadoEm,
          moto: created.moto
            ? { id: created.moto.id, nomeMoto: created.moto.nomeMoto, matricula: created.moto.matricula }
            : null,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Não foi possível cadastrar. Email/documento/matrícula podem já existir." },
      { status: 500 }
    );
  }
}