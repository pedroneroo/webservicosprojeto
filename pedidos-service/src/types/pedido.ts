export type Pedido = {
  id: number;
  produtoId: number;
  quantidade: number;
  precoUnitario: number;
  total: number;
  clienteEmail: string;
  status: "confirmado";
  notificacaoStatus: "nao_enviada";
  criadoEm: string;
};

export type ReservaEstoque = {
  produtoId: number;
  reservado: number;
  precoUnitario: number;
  estoqueRestante: number;
};

export type CriarPedidoInput = {
  produtoId?: unknown;
  quantidade?: unknown;
  clienteEmail?: unknown;
};
