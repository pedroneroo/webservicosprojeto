import { prisma } from "../lib/prisma";

export const produtosRepository = {
  listar() {
    return prisma.produto.findMany({ orderBy: { id: "asc" } });
  },

  buscarPorId(id: number) {
    return prisma.produto.findUnique({ where: { id } });
  },

  criar(data: { nome: string; preco: number; estoque: number }) {
    return prisma.produto.create({ data });
  },

  // Baixa o estoque de forma atômica: só atualiza se ainda houver estoque.
  // Retorna null se outra reserva consumiu o estoque no meio do caminho.
  reservar(id: number, quantidade: number) {
    return prisma.$transaction(async (tx) => {
      const resultado = await tx.produto.updateMany({
        where: { id, estoque: { gte: quantidade } },
        data: { estoque: { decrement: quantidade } }
      });

      if (resultado.count === 0) return null;
      return tx.produto.findUnique({ where: { id } });
    });
  }
};
