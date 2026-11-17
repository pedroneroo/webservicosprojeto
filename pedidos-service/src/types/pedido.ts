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
