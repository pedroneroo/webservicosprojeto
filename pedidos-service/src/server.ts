import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import pedidosRoutes from "./routes/pedidos.routes";
import { AppError } from "./errors/AppError";

if (!process.env.CATALOG_URL) {
  console.error("CATALOG_URL não definida. Copie .env.example para .env");
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(pedidosRoutes);

// Nunca devolver stack trace ao cliente
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof AppError) {
    return res.status(error.status).json({
      mensagem: error.mensagem,
      codigo: error.codigo
    });
  }
  if (error instanceof SyntaxError) {
    return res.status(400).json({
      mensagem: "Dados do pedido são inválidos",
      codigo: "DADOS_INVALIDOS"
    });
  }
  console.error(error);
  return res.status(500).json({
    mensagem: "Erro interno do servidor",
    codigo: "ERRO_INTERNO"
  });
});

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`pedidos-service rodando em http://localhost:${PORT}`);
});
