import { NextFunction, Request, Response } from "express";
import * as pedidoService from "../services/pedidos.service";
import { AppError } from "../errors/AppError";

export async function criar(req: Request, res: Response, next: NextFunction) {
  try {
    const pedido = await pedidoService.criarPedido(req.body);
    return res.status(201).json(pedido);
  } catch (error) {
    next(error);
  }
}

export function listar(_req: Request, res: Response) {
  return res.status(200).json(pedidoService.listarPedidos());
}

export function buscarPorId(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      throw new AppError("Pedido não encontrado", 404, "PEDIDO_NAO_ENCONTRADO");
    }
    return res.status(200).json(pedidoService.buscarPedidoPorId(id));
  } catch (error) {
    next(error);
  }
}
