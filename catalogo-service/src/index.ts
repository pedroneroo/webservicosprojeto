import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { ErroApi, Produto } from "./types";

const SERVICO = "catalogo-service";
const PORT = Number(process.env.PORT ?? 3001);
const DELAY_MS = Number(process.env.SIMULATE_DELAY_MS ?? 0);

// Dados pertencem somente a este serviço
const produtos: Produto[] = [
  { id: 1, nome: "Teclado Mecânico", preco: 94.95, estoque: 8 },
  { id: 2, nome: "Mouse Gamer", preco: 59.9, estoque: 15 },
  { id: 3, nome: "Monitor 24\"", preco: 749.0, estoque: 3 },
];
let proximoId = 4;

const app = express();
app.use(express.json());

// Correlation ID + log de cada requisição
app.use((req: Request, res: Response, next: NextFunction) => {
  const header = req.headers["x-correlation-id"];
  const cid = typeof header === "string" && header ? header : randomUUID();
  res.locals.correlationId = cid;
  res.setHeader("x-correlation-id", cid);
  res.on("finish", () => {
    console.log(`[${SERVICO}] [${cid}] ${req.method} ${req.originalUrl} -> ${res.statusCode}`);
  });
  next();
});

// Simulação opcional de lentidão (para testar 504 em Pedidos)
app.use(async (_req, _res, next) => {
  if (DELAY_MS > 0) await new Promise((r) => setTimeout(r, DELAY_MS));
  next();
});

const erro = (res: Response, status: number, mensagem: string, codigo: string) =>
  res.status(status).json({ mensagem, codigo } satisfies ErroApi);

app.get("/produtos", (_req, res) => {
  res.status(200).json(produtos);
});

app.get("/produtos/:id", (req, res) => {
  const produto = produtos.find((p) => p.id === Number(req.params.id));
  if (!produto) return erro(res, 404, "Produto não encontrado", "PRODUTO_NAO_ENCONTRADO");
  res.status(200).json(produto);
});

app.post("/produtos", (req, res) => {
  const { nome, preco, estoque } = req.body ?? {};
  const valido =
    typeof nome === "string" && nome.trim() !== "" &&
    typeof preco === "number" && preco > 0 &&
    Number.isInteger(estoque) && estoque >= 0;
  if (!valido) return erro(res, 400, "Dados do produto são inválidos", "DADOS_INVALIDOS");

  const novo: Produto = { id: proximoId++, nome: nome.trim(), preco, estoque };
  produtos.push(novo);
  res.status(201).json(novo);
});

app.post("/produtos/:id/reservas", (req, res) => {
  const quantidade = req.body?.quantidade;
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    return erro(res, 400, "Quantidade inválida", "DADOS_INVALIDOS");
  }

  const produto = produtos.find((p) => p.id === Number(req.params.id));
  if (!produto) return erro(res, 404, "Produto não encontrado", "PRODUTO_NAO_ENCONTRADO");

  if (quantidade > produto.estoque) {
    return erro(res, 409, "Estoque insuficiente", "ESTOQUE_INSUFICIENTE");
  }

  produto.estoque -= quantidade;
  // precoUnitario é devolvido para que Pedidos calcule o total sem confiar no cliente
  res.status(200).json({
    reservado: quantidade,
    estoqueRestante: produto.estoque,
    precoUnitario: produto.preco,
  });
});

app.use((_req, res) => erro(res, 404, "Rota não encontrada", "ROTA_NAO_ENCONTRADA"));

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === "entity.parse.failed") {
    return erro(res, 400, "JSON inválido", "DADOS_INVALIDOS");
  }
  console.error(`[${SERVICO}] [${res.locals.correlationId}] erro interno: ${err?.message}`);
  erro(res, 500, "Erro interno do servidor", "ERRO_INTERNO");
});

app.listen(PORT, () => console.log(`[${SERVICO}] rodando em http://localhost:${PORT}`));
