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

export async function listar(_req: Request, res: Response, next: NextFunction) {
  try {
    return res.status(200).json(await pedidoService.listarPedidos());
  } catch (error) {
    next(error);
  }
}

export async function buscarPorId(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Pedido não encontrado", 404, "PEDIDO_NAO_ENCONTRADO");
    }
    return res.status(200).json(await pedidoService.buscarPedidoPorId(id));
  } catch (error) {
    next(error);
  }
}
