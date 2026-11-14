// Erro padrao do que o aparelho pode recusar ou nao ter: permissao negada, camera ou GPS
// indisponiveis, foto num formato que o servidor nao aceita. As telas mostram a "message" ao
// usuario e podem usar o "codigo" para sugerir outro caminho (ex.: escolher da galeria).
// E separado do ErroApi (services/api/erro.ts), que so cobre respostas de servidor.

export type CodigoErroAparelho = 'PERMISSAO_NEGADA' | 'INDISPONIVEL' | 'FORMATO_INVALIDO';

export class ErroAparelho extends Error {
  readonly codigo: CodigoErroAparelho;

  constructor(codigo: CodigoErroAparelho, mensagem: string) {
    super(mensagem);
    this.name = 'ErroAparelho';
    this.codigo = codigo;
  }
}

export function ehErroAparelho(erro: unknown): erro is ErroAparelho {
  return erro instanceof ErroAparelho;
}
