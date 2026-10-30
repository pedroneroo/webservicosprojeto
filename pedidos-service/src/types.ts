export interface Pedido {
  id: number;
  produtoId: number;
  quantidade: number;
  clienteEmail: string;
  total: number;
  status: "confirmado";
  notificacaoStatus: "enviada" | "pendente";
  criadoEm: string;
}

export interface ErroApi {
  mensagem: string;
  codigo: string;
}

export interface ReservaCatalogo {
  reservado: number;
  estoqueRestante: number;
  precoUnitario: number;
}
