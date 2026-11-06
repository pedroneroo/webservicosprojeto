import { Router } from "express";
import * as pedidoController from "../controllers/pedidos.controller";

const router = Router();

router.post("/pedidos", pedidoController.criar);
router.get("/pedidos", pedidoController.listar);
router.get("/pedidos/:id", pedidoController.buscarPorId);

export default router;
