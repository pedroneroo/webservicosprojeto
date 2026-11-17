import "dotenv/config";
import express from "express";
import pedidosRoutes from "./routes/pedidos.routes";
import { errorHandler } from "./errors/handler";

for (const variavel of ["CATALOG_URL", "DATABASE_URL"]) {
  if (!process.env[variavel]) {
    console.error(`${variavel} não definida. Copie .env.example para .env`);
    process.exit(1);
  }
}

const app = express();
app.use(express.json());
app.use(pedidosRoutes);
app.use(errorHandler);

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`pedidos-service rodando em http://localhost:${PORT}`);
});
