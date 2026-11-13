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

export function mensagemDeErro(erro: unknown): string {
  if (!ehErroApi(erro)) return MENSAGEM_GENERICA;

  if (erro.status === 0) return 'Sem conexão. Verifique a internet e tente de novo.';
  if (erro.status === 401) return 'E-mail ou senha incorretos.';
  if (erro.status === 409) return 'Este e-mail já tem conta.';
  if (erro.status === 400) return 'Confira os dados e tente de novo.';
  if (erro.status >= 500) return 'O servidor está com problemas. Tente de novo em instantes.';
  return MENSAGEM_GENERICA;
}
