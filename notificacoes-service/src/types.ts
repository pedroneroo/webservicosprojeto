export interface Notificacao {
  id: number;
  pedidoId: number;
  destino: string;
  mensagem: string;
  status: "enviada";
  criadaEm: string;
}

export interface ErroApi {
  mensagem: string;
  codigo: string;
}
