import { Router } from "express";
import * as produtosController from "../controllers/produtos.controller";

const router = Router();

router.get("/produtos", produtosController.listar);
router.get("/produtos/:id", produtosController.buscarPorId);
router.post("/produtos", produtosController.criar);
router.post("/produtos/:id/reservas", produtosController.reservar);

export default router;
