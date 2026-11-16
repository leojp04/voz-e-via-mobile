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

// Ao editar um reporte, toda frase diz se as mudancas foram ou NAO salvas. O 409 significa que o
// status mudou (ex.: a prefeitura ja pegou o reporte) e ele nao aceita mais edicao.
export function mensagemDeErroAoEditar(erro: unknown): string {
  if (ehErroApi(erro)) {
    if (erro.status === 0) return 'Sem conexão. As suas mudanças não foram salvas. Tente de novo.';
    if (erro.status === 409) {
      return 'Este reporte já não está em aberto e não pode mais ser editado.';
    }
    if (erro.status === 404) return 'Reporte não encontrado.';
    if (erro.status === 400 || erro.status === 422) {
      return 'Confira os dados do reporte e tente de novo.';
    }
    if (erro.status >= 500) {
      return 'O servidor está com problemas. As suas mudanças não foram salvas. Tente de novo em instantes.';
    }
  }
  return 'Não foi possível salvar as mudanças. Tente de novo.';
}

// Ao cancelar um reporte: a frase diz se ele foi ou NAO cancelado.
export function mensagemDeErroAoCancelar(erro: unknown): string {
  if (ehErroApi(erro)) {
    if (erro.status === 0) return 'Sem conexão. O reporte não foi cancelado. Tente de novo.';
    if (erro.status === 409) {
      return 'Este reporte já não está em aberto e não pode mais ser cancelado.';
    }
    if (erro.status === 404) return 'Reporte não encontrado.';
    if (erro.status >= 500) {
      return 'O servidor está com problemas. O reporte não foi cancelado. Tente de novo em instantes.';
    }
  }
  return 'Não foi possível cancelar o reporte. Tente de novo.';
}

// Ao carregar uma lista ou um detalhe (so leitura): nada foi alterado, entao a frase so explica
// por que nao apareceu e sugere tentar de novo.
export function mensagemDeErroAoCarregar(erro: unknown): string {
  if (ehErroApi(erro)) {
    if (erro.status === 0) return 'Sem conexão. Verifique a internet e tente de novo.';
    if (erro.status === 404) return 'Reporte não encontrado.';
    if (erro.status >= 500) return 'O servidor está com problemas. Tente de novo em instantes.';
  }
  return 'Não foi possível carregar. Tente de novo.';
}

// Ao carregar contatos (lista ou um contato): igual a mensagemDeErroAoCarregar, mas o 404 fala de
// contato. Antes as telas de contatos reaproveitavam a dos reportes e mostravam "Reporte nao
// encontrado." (visto no simulador contra a API Java real).
export function mensagemDeErroAoCarregarContatos(erro: unknown): string {
  if (ehErroApi(erro) && erro.status === 404) return 'Contato não encontrado.';
  return mensagemDeErroAoCarregar(erro);
}

// Ao salvar um contato de emergencia: a frase diz se ele foi ou NAO salvo.
export function mensagemDeErroAoSalvarContato(erro: unknown): string {
  if (ehErroApi(erro)) {
    if (erro.status === 0) return 'Sem conexão. O contato não foi salvo. Tente de novo.';
    if (erro.status === 404) return 'Contato ou perfil não encontrado. O contato não foi salvo.';
    if (erro.status === 400) return 'Confira os dados do contato. Ele não foi salvo.';
    if (erro.status === 409) {
      return 'Você já tem 10 contatos. Exclua um para adicionar outro. O contato não foi salvo.';
    }
    if (erro.status >= 500) {
      return 'O servidor está com problemas. O contato não foi salvo. Tente de novo em instantes.';
    }
  }
  return 'Não foi possível salvar o contato. Tente de novo.';
}

// Ao excluir um contato: a frase diz se ele foi ou NAO excluido.
export function mensagemDeErroAoExcluirContato(erro: unknown): string {
  if (ehErroApi(erro)) {
    if (erro.status === 0) return 'Sem conexão. O contato não foi excluído. Tente de novo.';
    if (erro.status === 404) return 'Contato não encontrado.';
    if (erro.status >= 500) {
      return 'O servidor está com problemas. O contato não foi excluído. Tente de novo em instantes.';
    }
  }
  return 'Não foi possível excluir o contato. Tente de novo.';
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

// Ao falar com o assistente: toda frase diz que NADA foi feito. O assistente so sugere, mas a
// pessoa precisa saber que nenhum reporte, ligacao ou alerta saiu por causa do erro.
export function mensagemDeErroDoAssistente(erro: unknown): string {
  if (ehErroApi(erro)) {
    if (erro.status === 0) return 'Sem conexão. Nada foi feito. Tente de novo.';
    if (erro.status === 400) {
      return 'Não consegui entender o que você escreveu. Nada foi feito. Tente com outras palavras.';
    }
    if (erro.status === 401) return 'Sua sessão venceu. Entre de novo.';
    if (erro.status >= 500) {
      return 'O servidor está com problemas. Nada foi feito. Tente de novo em instantes.';
    }
  }
  return 'Não foi possível falar com o assistente. Nada foi feito. Tente de novo.';
}
