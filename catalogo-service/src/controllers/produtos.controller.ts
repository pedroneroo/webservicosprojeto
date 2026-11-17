import { NextFunction, Request, Response } from "express";
import * as produtosService from "../services/produtos.service";
import { AppError } from "../errors/AppError";

function lerId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("Produto não encontrado", 404, "PRODUTO_NAO_ENCONTRADO");
  }
  return id;
}

export async function listar(_req: Request, res: Response, next: NextFunction) {
  try {
    return res.status(200).json(await produtosService.listarProdutos());
  } catch (error) {
    next(error);
  }
}

export async function buscarPorId(req: Request, res: Response, next: NextFunction) {
  try {
    return res.status(200).json(await produtosService.buscarProduto(lerId(req)));
  } catch (error) {
    next(error);
  }
}

export async function criar(req: Request, res: Response, next: NextFunction) {
  try {
    return res.status(201).json(await produtosService.criarProduto(req.body));
  } catch (error) {
    next(error);
  }
}

export async function reservar(req: Request, res: Response, next: NextFunction) {
  try {
    const reserva = await produtosService.reservarEstoque(lerId(req), req.body);
    return res.status(200).json(reserva);
  } catch (error) {
    next(error);
  }
}
