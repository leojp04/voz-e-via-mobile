// Erro padrao das chamadas as APIs. As telas mostram a "mensagem" ao usuario e usam o
// "status" para decidir o que fazer (ex.: 401 volta para o login).
// Status 0 significa que nao houve resposta (sem internet ou servidor fora do ar).

export class ErroApi extends Error {
  readonly status: number;
  readonly campos: Record<string, string>;

  constructor(status: number, mensagem: string, campos: Record<string, string> = {}) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
    this.campos = campos;
  }
}

export function ehErroApi(erro: unknown): erro is ErroApi {
  return erro instanceof ErroApi;
}
