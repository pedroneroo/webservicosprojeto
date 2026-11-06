import { reservarEstoque } from "../clients/catalogo.client";
import { gerarId, pedidos } from "../data/pedidos";
import { AppError } from "../errors/AppError";
import { CriarPedidoInput, Pedido } from "../types/pedido";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function dadosInvalidos(): AppError {
  return new AppError("Dados do pedido são inválidos", 400, "DADOS_INVALIDOS");
}

export async function criarPedido(input: CriarPedidoInput): Promise<Pedido> {
  // 1. VALIDAR (nada de rede nem push antes disso)
  const { produtoId, quantidade, clienteEmail } = input ?? {};

  if (!Number.isInteger(produtoId) || (produtoId as number) <= 0) {
    throw dadosInvalidos();
  }
  if (!Number.isInteger(quantidade) || (quantidade as number) <= 0) {
    throw dadosInvalidos();
  }
  if (typeof clienteEmail !== "string" || !EMAIL_REGEX.test(clienteEmail.trim())) {
    throw dadosInvalidos();
  }

  const idProduto = produtoId as number;
  const qtd = quantidade as number;

  // 2. RESERVAR (se falhar, lança AppError e o pedido NÃO é criado)
  const reserva = await reservarEstoque(idProduto, qtd);

  // 3. CALCULAR com o preço confiável vindo do Catálogo
  const total = reserva.precoUnitario * qtd;

  // 4. PERSISTIR somente depois da reserva confirmada
  const novoPedido: Pedido = {
    id: gerarId(),
    produtoId: idProduto,
    quantidade: qtd,
    precoUnitario: reserva.precoUnitario,
    total,
    clienteEmail: clienteEmail.trim(),
    status: "confirmado",
    notificacaoStatus: "nao_enviada",
    criadoEm: new Date().toISOString()
  };

  pedidos.push(novoPedido);
  return novoPedido;
}

export function listarPedidos(): Pedido[] {
  return pedidos;
}

export function buscarPedidoPorId(id: number): Pedido {
  const pedido = pedidos.find((p) => p.id === id);
  if (!pedido) {
    throw new AppError("Pedido não encontrado", 404, "PEDIDO_NAO_ENCONTRADO");
  }
  return pedido;
}
