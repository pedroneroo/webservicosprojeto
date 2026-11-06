import { Pedido } from "../types/pedido";

export const pedidos: Pedido[] = [];

let proximoId = 1;
export function gerarId(): number {
  return proximoId++;
}
