// Traduz um erro qualquer numa frase amigavel para o usuario. Nunca devolve texto tecnico do
// servidor nem da biblioteca (item P1 do checklist de seguranca): so frases escritas aqui.

import { ehErroApi } from '../services/api/erro';

const MENSAGEM_GENERICA = 'Algo deu errado. Tente de novo.';

// Ao excluir a conta o usuario ja esta logado, entao o 401 significa "sessao vencida" (e nao
// "senha errada"). Todas as frases deixam claro que a conta NAO foi excluida.
export function mensagemDeErroAoExcluir(erro: unknown): string {
  if (ehErroApi(erro)) {
    if (erro.status === 401) return 'Sua sessão venceu. Entre de novo para excluir a conta.';
    if (erro.status === 0) return 'Sem conexão. A sua conta não foi excluída. Tente de novo.';
    if (erro.status >= 500) {
      return 'O servidor está com problemas. A sua conta não foi excluída. Tente de novo em instantes.';
    }
  }
  return 'Algo deu errado. A sua conta não foi excluída. Tente de novo.';
}

// Ao enviar um reporte, toda frase deixa claro que ele NAO foi enviado, para a pessoa saber que
// pode tentar de novo sem medo de duplicar (a chave de idempotencia evita o reporte repetido).
export function mensagemDeErroDoReporte(erro: unknown): string {
  if (ehErroApi(erro)) {
    if (erro.status === 0) return 'Sem conexão. O seu reporte não foi enviado. Tente de novo.';
    if (erro.status === 429) {
      return 'Muitos reportes em pouco tempo. Espere um minuto e tente de novo.';
    }
    if (erro.status === 400 || erro.status === 422) {
      return 'Confira os dados do reporte e tente de novo.';
    }
    if (erro.status >= 500) {
      return 'O servidor está com problemas. O seu reporte não foi enviado. Tente de novo em instantes.';
    }
  }
  return 'Não foi possível enviar o reporte. Tente de novo.';
}

export function mensagemDeErroDaFoto(erro: unknown): string {
  if (ehErroApi(erro)) {
    if (erro.status === 0) return 'Sem conexão. A foto não foi enviada. Tente de novo.';
    if (erro.status === 400) return 'A foto não foi aceita. Escolha outra, em JPEG ou PNG.';
    if (erro.status >= 500) {
      return 'O servidor está com problemas. A foto não foi enviada. Tente de novo em instantes.';
    }
  }
  return 'Não foi possível enviar a foto. Tente de novo.';
}

export function mensagemDeErro(erro: unknown): string {
  if (!ehErroApi(erro)) return MENSAGEM_GENERICA;

  if (erro.status === 0) return 'Sem conexão. Verifique a internet e tente de novo.';
  if (erro.status === 401) return 'E-mail ou senha incorretos.';
  if (erro.status === 409) return 'Este e-mail já tem conta.';
  if (erro.status === 400) return 'Confira os dados e tente de novo.';
  if (erro.status >= 500) return 'O servidor está com problemas. Tente de novo em instantes.';
  return MENSAGEM_GENERICA;
}
