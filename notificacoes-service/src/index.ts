import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { ErroApi, Notificacao } from "./types";

const SERVICO = "notificacoes-service";
const PORT = Number(process.env.PORT ?? 3002);

const notificacoes: Notificacao[] = [];
let proximoId = 1;

const app = express();
app.use(express.json());

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

const erro = (res: Response, status: number, mensagem: string, codigo: string) =>
  res.status(status).json({ mensagem, codigo } satisfies ErroApi);

app.post("/notificacoes", (req, res) => {
  const { pedidoId, destino, mensagem } = req.body ?? {};
  const valido =
    Number.isInteger(pedidoId) && pedidoId > 0 &&
    typeof destino === "string" && destino.includes("@") &&
    typeof mensagem === "string" && mensagem.trim() !== "";
  if (!valido) return erro(res, 400, "Dados da notificação são inválidos", "DADOS_INVALIDOS");

  // Simulação: registra a tentativa de envio (não envia e-mail de verdade)
  const nova: Notificacao = {
    id: proximoId++,
    pedidoId,
    destino,
    mensagem,
    status: "enviada",
    criadaEm: new Date().toISOString(),
  };
  notificacoes.push(nova);
  res.status(201).json(nova);
});

app.get("/notificacoes", (_req, res) => {
  res.status(200).json(notificacoes);
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
