export interface Produto {
  id: number;
  nome: string;
  preco: number;
  estoque: number;
}

export interface ErroApi {
  mensagem: string;
  codigo: string;
}
