import { NextFunction, Request, Response } from "express";
import { AppError } from "./AppError";

// Detecta falha de conexão com o PostgreSQL (banco parado, porta errada...)
function bancoIndisponivel(error: any): boolean {
  const codigos = ["P1001", "P1002", "P1017", "ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT"];
  return (
    error?.name === "PrismaClientInitializationError" ||
    codigos.includes(error?.code) ||
    codigos.includes(error?.cause?.code) ||
    codigos.includes(error?.cause?.cause?.code)
  );
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof AppError) {
    return res.status(error.status).json({
      mensagem: error.mensagem,
      codigo: error.codigo
    });
  }

  if (error instanceof SyntaxError) {
    return res.status(400).json({
      mensagem: "JSON inválido",
      codigo: "DADOS_INVALIDOS"
    });
  }

  // O erro completo fica só no log do servidor; o cliente nunca vê stack trace
  console.error(error);

  if (bancoIndisponivel(error)) {
    return res.status(503).json({
      mensagem: "Banco de dados indisponível",
      codigo: "BANCO_INDISPONIVEL"
    });
  }

  return res.status(500).json({
    mensagem: "Erro interno do servidor",
    codigo: "ERRO_INTERNO"
  });
}
