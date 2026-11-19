// Traduz um erro qualquer numa frase amigavel para o usuario. Nunca devolve texto tecnico do
// servidor nem da biblioteca (item P1 do checklist de seguranca): so frases escritas aqui.

import { ehErroApi, ErroExclusaoParcial } from '../services/api/erro';

const MENSAGEM_GENERICA = 'Algo deu errado. Tente de novo.';

// Ao excluir a conta o usuario ja esta logado, entao o 401 significa "sessao vencida" (e nao
// "senha errada"). Todas as frases deixam claro que a conta NAO foi excluida, exceto a da exclusao
// parcial, que diz o que JA sumiu (os reportes) e que a conta ainda existe.
export function mensagemDeErroAoExcluir(erro: unknown): string {
  // Vem antes dos status: o erro parcial tambem carrega o status do Java (0, 500...), mas a frase
  // "a sua conta nao foi excluida. Tente de novo" esconderia que os reportes ja foram apagados.
  if (erro instanceof ErroExclusaoParcial) {
    return 'Seus reportes foram apagados, mas a sua conta ainda não foi excluída. Toque em "Excluir minha conta" de novo.';
  }
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
    // 409 aqui: a mesma Idempotency-Key ainda esta sendo processada pelo .NET. O reporte ja esta a
    // caminho, entao reenviar so geraria outro 409.
    if (erro.status === 409) {
      return 'O seu reporte ainda está sendo enviado. Espere um instante e confira em "Meus reportes".';
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
    // 413: a foto passa do limite de 5 MB da API .NET.
    if (erro.status === 413) return 'A foto é grande demais. Escolha outra, de até 5 MB.';
    // 429: limite de fotos por minuto da API .NET (por pessoa).
    if (erro.status === 429) {
      return 'Muitas fotos em pouco tempo. A foto não foi enviada. Espere um minuto e tente de novo.';
    }
    // 409: o reporte mudou de status ou foi alterado por outra pessoa enquanto a foto subia.
    if (erro.status === 409) {
      return 'Este reporte já não aceita foto, porque mudou ou não está mais em aberto. A foto não foi enviada.';
    }
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

// Ao salvar o perfil de emergencia: a frase diz se ele foi ou NAO salvo. Nunca repete o conteudo
// (dado de saude).
export function mensagemDeErroAoSalvarPerfil(erro: unknown): string {
  if (ehErroApi(erro)) {
    if (erro.status === 0) return 'Sem conexão. O perfil não foi salvo. Tente de novo.';
    if (erro.status === 400) return 'Confira os dados do perfil. Ele não foi salvo.';
    if (erro.status === 404) return 'Perfil não encontrado. Ele não foi salvo.';
    if (erro.status === 409) {
      return 'Você já tem um perfil. Abra "Meu perfil" para editar. Nada foi salvo.';
    }
    if (erro.status >= 500) {
      return 'O servidor está com problemas. O perfil não foi salvo. Tente de novo em instantes.';
    }
  }
  return 'Não foi possível salvar o perfil. Tente de novo.';
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
    if (erro.status === 408) {
      return 'O assistente demorou para responder. Nada foi feito. Tente de novo.';
    }
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
