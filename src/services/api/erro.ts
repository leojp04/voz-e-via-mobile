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

/**
 * A exclusao de conta apaga em duas APIs (primeiro o .NET, depois o Java). Este erro diz que o .NET JA
 * apagou (reportes, historico e fotos sumiram) mas o Java falhou: a conta ainda existe, e a pessoa
 * pode tocar em "Excluir" de novo. Mantem o status e a mensagem do erro do Java.
 */
export class ErroExclusaoParcial extends ErroApi {
  constructor(causa: ErroApi) {
    super(causa.status, causa.message, causa.campos);
    this.name = 'ErroExclusaoParcial';
  }
}

export function ehErroApi(erro: unknown): erro is ErroApi {
  return erro instanceof ErroApi;
}
