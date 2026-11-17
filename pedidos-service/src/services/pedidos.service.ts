import { reservarEstoque } from "../clients/catalogo.client";
import { AppError } from "../errors/AppError";
import { pedidosRepository } from "../repositories/pedidos.repository";
import { CriarPedidoInput } from "../types/pedido";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PedidoDb = NonNullable<
  Awaited<ReturnType<typeof pedidosRepository.buscarPorId>>
>;

// Decimal vira number para manter o contrato REST da Parte 2
function paraResposta(p: PedidoDb) {
  return {
    id: p.id,
    produtoId: p.produtoId,
    quantidade: p.quantidade,
    clienteEmail: p.clienteEmail,
    precoUnitario: Number(p.precoUnitario),
    total: Number(p.total),
    status: p.status,
    criadoEm: p.criadoEm
  };
}

function dadosInvalidos(): AppError {
  return new AppError("Dados do pedido são inválidos", 400, "DADOS_INVALIDOS");
}

export async function criarPedido(input: CriarPedidoInput) {
  // 1. VALIDAR
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

  // Banco de Pedidos fora? Falha ANTES de reservar, para não "queimar" estoque à toa
  await pedidosRepository.verificarConexao();

  // 2. RESERVAR (se falhar, nada é gravado em pedidos_db)
  const reserva = await reservarEstoque(idProduto, qtd);

  // 3. CALCULAR com o preço confiável do Catálogo
  const precoUnitario = Number(reserva.precoUnitario);
  const total = precoUnitario * qtd;

  // 4. PERSISTIR no PostgreSQL somente depois da reserva confirmada
  const pedido = await pedidosRepository.criar({
    produtoId: idProduto,
    quantidade: qtd,
    clienteEmail: clienteEmail.trim(),
    precoUnitario,
    total
  });

  return paraResposta(pedido);
}

export async function listarPedidos() {
  const pedidos = await pedidosRepository.listar();
  return pedidos.map(paraResposta);
}

export async function buscarPedidoPorId(id: number) {
  const pedido = await pedidosRepository.buscarPorId(id);
  if (!pedido) {
    throw new AppError("Pedido não encontrado", 404, "PEDIDO_NAO_ENCONTRADO");
  }
  return paraResposta(pedido);
}
