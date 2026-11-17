import { AppError } from "../errors/AppError";
import { ReservaEstoque } from "../types/pedido";

function catalogUrl(): string {
  const url = process.env.CATALOG_URL;
  if (!url) {
    throw new Error("CATALOG_URL não definida no ambiente");
  }
  return url;
}

export async function reservarEstoque(
  produtoId: number,
  quantidade: number
): Promise<ReservaEstoque> {
  let resposta: Response;

  try {
    resposta = await fetch(`${catalogUrl()}/produtos/${produtoId}/reservas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantidade })
    });
  } catch {
    throw new AppError("Catálogo indisponível", 502, "CATALOGO_INDISPONIVEL");
  }

  // fetch não lança erro em 404/409: precisa checar resposta.ok
  if (!resposta.ok) {
    if (resposta.status === 400) {
      throw new AppError("Dados do pedido são inválidos", 400, "DADOS_INVALIDOS");
    }
    if (resposta.status === 404) {
      throw new AppError("Produto não encontrado", 404, "PRODUTO_NAO_ENCONTRADO");
    }
    if (resposta.status === 409) {
      throw new AppError("Estoque insuficiente", 409, "ESTOQUE_INSUFICIENTE");
    }
    throw new AppError("Catálogo indisponível", 502, "CATALOGO_INDISPONIVEL");
  }

  try {
    return (await resposta.json()) as ReservaEstoque;
  } catch {
    throw new AppError("Catálogo indisponível", 502, "CATALOGO_INDISPONIVEL");
  }
}
