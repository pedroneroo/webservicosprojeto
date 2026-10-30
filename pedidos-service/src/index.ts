import express, { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { CATALOG_URL, NOTIFICATION_URL, PORT } from "./config";
import { fetchComTimeout, foiTimeout } from "./http-client";
import { ErroApi, Pedido, ReservaCatalogo } from "./types";

const SERVICO = "pedidos-service";

const pedidos: Pedido[] = [];
let proximoId = 1;

/** Erro de negócio/integração já traduzido para o contrato da nossa API. */
class ErroHttp extends Error {
  constructor(public status: number, public codigo: string, mensagem: string) {
    super(mensagem);
  }
}

const log = (cid: string, msg: string) => console.log(`[${SERVICO}] [${cid}] ${msg}`);

// ---------- Integração com Catálogo (dependência CRÍTICA) ----------
async function reservarEstoque(
  produtoId: number,
  quantidade: number,
  cid: string
): Promise<ReservaCatalogo> {
  const url = `${CATALOG_URL}/produtos/${produtoId}/reservas`;
  let resp: globalThis.Response;

  try {
    resp = await fetchComTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-correlation-id": cid },
      body: JSON.stringify({ quantidade }),
    });
  } catch (err) {
    if (foiTimeout(err)) {
      log(cid, `POST ${url} -> TIMEOUT`);
      throw new ErroHttp(504, "CATALOGO_TIMEOUT", "Catálogo demorou para responder");
    }
    log(cid, `POST ${url} -> FALHA DE REDE`);
    throw new ErroHttp(502, "CATALOGO_INDISPONIVEL", "Catálogo indisponível");
  }

  log(cid, `POST ${url} -> ${resp.status}`);

  if (resp.ok) {
    try {
      return (await resp.json()) as ReservaCatalogo;
    } catch {
      throw new ErroHttp(502, "CATALOGO_INDISPONIVEL", "Catálogo indisponível");
    }
  }

  // Traduz o status do Catálogo para o contrato de erros de Pedidos
  switch (resp.status) {
    case 400:
      throw new ErroHttp(400, "DADOS_INVALIDOS", "Dados do pedido são inválidos");
    case 404:
      throw new ErroHttp(404, "PRODUTO_NAO_ENCONTRADO", "Produto não encontrado");
    case 409:
      throw new ErroHttp(409, "ESTOQUE_INSUFICIENTE", "Estoque insuficiente");
    default: // 5xx ou qualquer status inesperado
      throw new ErroHttp(502, "CATALOGO_INDISPONIVEL", "Catálogo indisponível");
  }
}

// ---------- Integração com Notificações (dependência SECUNDÁRIA) ----------
async function notificar(pedido: Pedido, cid: string): Promise<"enviada" | "pendente"> {
  const url = `${NOTIFICATION_URL}/notificacoes`;
  try {
    const resp = await fetchComTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-correlation-id": cid },
      body: JSON.stringify({
        pedidoId: pedido.id,
        destino: pedido.clienteEmail,
        mensagem: `Pedido ${pedido.id} confirmado`,
      }),
    });
    log(cid, `POST ${url} -> ${resp.status}`);
    return resp.status === 201 ? "enviada" : "pendente";
  } catch (err) {
    // Falha de notificação NUNCA desfaz o pedido: apenas fica "pendente"
    log(cid, `POST ${url} -> ${foiTimeout(err) ? "TIMEOUT" : "FALHA DE REDE"} (notificação pendente)`);
    return "pendente";
  }
}

// ---------- App ----------
const app = express();
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  const header = req.headers["x-correlation-id"];
  const cid = typeof header === "string" && header ? header : randomUUID();
  res.locals.correlationId = cid;
  res.setHeader("x-correlation-id", cid);
  res.on("finish", () => log(cid, `${req.method} ${req.originalUrl} -> ${res.statusCode}`));
  next();
});

const erro = (res: Response, status: number, mensagem: string, codigo: string) =>
  res.status(status).json({ mensagem, codigo } satisfies ErroApi);

app.post("/pedidos", async (req: Request, res: Response) => {
  const cid: string = res.locals.correlationId;
  try {
    // 1. validar body
    const { produtoId, quantidade, clienteEmail } = req.body ?? {};
    const valido =
      Number.isInteger(produtoId) && produtoId > 0 &&
      Number.isInteger(quantidade) && quantidade > 0 &&
      typeof clienteEmail === "string" && /^\S+@\S+\.\S+$/.test(clienteEmail);
    if (!valido) throw new ErroHttp(400, "DADOS_INVALIDOS", "Dados do pedido são inválidos");

    // 2. reservar estoque (se falhar, o pedido NÃO é criado)
    const reserva = await reservarEstoque(produtoId, quantidade, cid);

    // 3. criar pedido (total calculado com o preço do Catálogo, não do cliente)
    const pedido: Pedido = {
      id: proximoId++,
      produtoId,
      quantidade,
      clienteEmail,
      total: Math.round(reserva.precoUnitario * quantidade * 100) / 100,
      status: "confirmado",
      notificacaoStatus: "pendente",
      criadoEm: new Date().toISOString(),
    };
    pedidos.push(pedido);

    // 4. notificar (se falhar, o pedido permanece criado)
    pedido.notificacaoStatus = await notificar(pedido, cid);

    // 5. responder
    res.status(201).json(pedido);
  } catch (err) {
    if (err instanceof ErroHttp) return erro(res, err.status, err.message, err.codigo);
    console.error(`[${SERVICO}] [${cid}] erro inesperado: ${(err as Error)?.message}`);
    erro(res, 500, "Erro interno do servidor", "ERRO_INTERNO");
  }
});

app.get("/pedidos", (_req, res) => {
  res.status(200).json(pedidos);
});

app.get("/pedidos/:id", (req, res) => {
  const pedido = pedidos.find((p) => p.id === Number(req.params.id));
  if (!pedido) return erro(res, 404, "Pedido não encontrado", "PEDIDO_NAO_ENCONTRADO");
  res.status(200).json(pedido);
});

app.use((_req, res) => erro(res, 404, "Rota não encontrada", "ROTA_NAO_ENCONTRADA"));

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === "entity.parse.failed") {
    return erro(res, 400, "JSON inválido", "DADOS_INVALIDOS");
  }
  console.error(`[${SERVICO}] [${res.locals.correlationId}] erro interno: ${err?.message}`);
  erro(res, 500, "Erro interno do servidor", "ERRO_INTERNO");
});

app.listen(PORT, () => log("-", `rodando em http://localhost:${PORT} (CATALOG_URL=${CATALOG_URL}, NOTIFICATION_URL=${NOTIFICATION_URL})`));
