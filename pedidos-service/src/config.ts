import "dotenv/config";

function exigir(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`${nome} não configurada`);
  return valor;
}

export const PORT = Number(process.env.PORT ?? 3000);
export const CATALOG_URL = exigir("CATALOG_URL");
export const NOTIFICATION_URL = exigir("NOTIFICATION_URL");
export const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 3000);
