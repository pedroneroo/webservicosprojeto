import { AppError } from "../errors/AppError";
import { ReservaEstoque } from "../types/pedido";

function catalogUrl(): string {
  const url = process.env.CATALOG_URL;
  if (!url) {
    throw new Error("CATALOG_URL não definida no ambiente");
  }
  return url;
}

function codigoPorStatus(status: number): string {
  if (status === 400) return "DADOS_INVALIDOS";
  if (status === 404) return "PRODUTO_NAO_ENCONTRADO";
  if (status === 409) return "ESTOQUE_INSUFICIENTE";
  return "CATALOGO_INDISPONIVEL";
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
    // fetch rejeitou: sem resposta HTTP (serviço fora, porta errada, rede)
    throw new AppError("Catálogo indisponível", 502, "CATALOGO_INDISPONIVEL");
  }

  // fetch NÃO lança erro em 404/409: precisa checar resposta.ok
  if (!resposta.ok) {
    if (resposta.status >= 500) {
      throw new AppError("Catálogo indisponível", 502, "CATALOGO_INDISPONIVEL");
    }
    const mensagens: Record<number, string> = {
      400: "Dados do pedido são inválidos",
      404: "Produto não encontrado",
      409: "Estoque insuficiente"
    };
    throw new AppError(
      mensagens[resposta.status] ?? "Falha ao reservar estoque",
      resposta.status,
      codigoPorStatus(resposta.status)
    );
  }

  try {
    return (await resposta.json()) as ReservaEstoque;
  } catch {
    throw new AppError("Resposta inválida do Catálogo", 502, "CATALOGO_INDISPONIVEL");
  }
}
