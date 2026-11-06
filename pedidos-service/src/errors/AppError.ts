export class AppError extends Error {
  constructor(
    public mensagem: string,
    public status: number,
    public codigo: string
  ) {
    super(mensagem);
    this.name = "AppError";
  }
}
