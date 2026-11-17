import { prisma } from "../lib/prisma";

export const pedidosRepository = {
  // Falha cedo (antes de reservar estoque) se o banco de Pedidos estiver fora
  async verificarConexao() {
    await prisma.$queryRaw`SELECT 1`;
  },

  criar(data: {
    produtoId: number;
    quantidade: number;
    clienteEmail: string;
    precoUnitario: number;
    total: number;
  }) {
    return prisma.pedido.create({ data: { ...data, status: "CONFIRMADO" } });
  },

  listar() {
    return prisma.pedido.findMany({ orderBy: { id: "asc" } });
  },

  buscarPorId(id: number) {
    return prisma.pedido.findUnique({ where: { id } });
  }
};
