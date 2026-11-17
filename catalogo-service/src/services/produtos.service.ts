import { AppError } from "../errors/AppError";
import { produtosRepository } from "../repositories/produtos.repository";

type ProdutoDb = NonNullable<
  Awaited<ReturnType<typeof produtosRepository.buscarPorId>>
>;

// Decimal do Prisma vira string no JSON; convertemos para number
// para manter o mesmo contrato REST da Parte 2.
function paraResposta(p: ProdutoDb) {
  return {
    id: p.id,
    nome: p.nome,
    preco: Number(p.preco),
    estoque: p.estoque,
    criadoEm: p.criadoEm
  };
}

export async function listarProdutos() {
  const produtos = await produtosRepository.listar();
  return produtos.map(paraResposta);
}

export async function buscarProduto(id: number) {
  const produto = await produtosRepository.buscarPorId(id);
  if (!produto) {
    throw new AppError("Produto não encontrado", 404, "PRODUTO_NAO_ENCONTRADO");
  }
  return paraResposta(produto);
}

export async function criarProduto(body: any) {
  const { nome, preco, estoque } = body ?? {};

  const valido =
    typeof nome === "string" &&
    nome.trim().length > 0 &&
    typeof preco === "number" &&
    Number.isFinite(preco) &&
    preco > 0 &&
    Number.isInteger(estoque) &&
    estoque >= 0;

  if (!valido) {
    throw new AppError("Dados do produto são inválidos", 400, "DADOS_INVALIDOS");
  }

  const produto = await produtosRepository.criar({
    nome: nome.trim(),
    preco,
    estoque
  });
  return paraResposta(produto);
}

export async function reservarEstoque(id: number, body: any) {
  const quantidade = body?.quantidade;

  // 1. validar quantidade
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw new AppError("Quantidade inválida", 400, "QUANTIDADE_INVALIDA");
  }

  // 2. produto existe?
  const produto = await produtosRepository.buscarPorId(id);
  if (!produto) {
    throw new AppError("Produto não encontrado", 404, "PRODUTO_NAO_ENCONTRADO");
  }

  // 3. estoque suficiente?
  if (produto.estoque < quantidade) {
    throw new AppError("Estoque insuficiente", 409, "ESTOQUE_INSUFICIENTE");
  }

  // 4. atualizar no banco (atômico; protege contra duas reservas simultâneas)
  const atualizado = await produtosRepository.reservar(id, quantidade);
  if (!atualizado) {
    throw new AppError("Estoque insuficiente", 409, "ESTOQUE_INSUFICIENTE");
  }

  // 5. contrato de reserva
  return {
    produtoId: atualizado.id,
    reservado: quantidade,
    precoUnitario: Number(atualizado.preco),
    estoqueRestante: atualizado.estoque
  };
}
