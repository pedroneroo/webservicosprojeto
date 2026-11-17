import "dotenv/config";
import express from "express";
import produtosRoutes from "./routes/produtos.routes";
import { errorHandler } from "./errors/handler";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não definida. Copie .env.example para .env");
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(produtosRoutes);
app.use(errorHandler);

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`catalogo-service rodando em http://localhost:${PORT}`);
});
