import { ErroApi } from '../services/api/erro';
import { mensagemDeErroAoExcluirContato, mensagemDeErroAoSalvarContato } from './mensagem-de-erro';

// Toda frase diz se o contato foi ou NAO foi salvo/excluido: sem contato, o assistente nao sabe
// quem chamar, e a pessoa precisa saber se pode tentar de novo.
describe('mensagemDeErroAoSalvarContato', () => {
  it('sem conexao diz que o contato nao foi salvo', () => {
    expect(mensagemDeErroAoSalvarContato(new ErroApi(0, 'rede'))).toBe(
      'Sem conexão. O contato não foi salvo. Tente de novo.',
    );
  });

  it('400 pede para conferir os dados e diz que nao foi salvo', () => {
    expect(mensagemDeErroAoSalvarContato(new ErroApi(400, 'x'))).toBe(
      'Confira os dados do contato. Ele não foi salvo.',
    );
  });

  it('409 explica o limite de 10 contatos', () => {
    const mensagem = mensagemDeErroAoSalvarContato(new ErroApi(409, 'x'));
    expect(mensagem).toBe(
      'Você já tem 10 contatos. Exclua um para adicionar outro. O contato não foi salvo.',
    );
  });

  it('404 diz que nao encontrou e que nada foi salvo', () => {
    expect(mensagemDeErroAoSalvarContato(new ErroApi(404, 'x'))).toBe(
      'Contato ou perfil não encontrado. O contato não foi salvo.',
    );
  });

  it('5xx fala do servidor e diz que nao foi salvo', () => {
    expect(mensagemDeErroAoSalvarContato(new ErroApi(503, 'x'))).toBe(
      'O servidor está com problemas. O contato não foi salvo. Tente de novo em instantes.',
    );
  });

  it('erro desconhecido vira frase generica, sem vazar detalhe tecnico', () => {
    const mensagem = mensagemDeErroAoSalvarContato(new TypeError('Cannot read properties'));
    expect(mensagem).toBe('Não foi possível salvar o contato. Tente de novo.');
    expect(mensagem).not.toMatch(/TypeError|properties/);
  });
});

describe('mensagemDeErroAoExcluirContato', () => {
  it('sem conexao diz que o contato nao foi excluido', () => {
    expect(mensagemDeErroAoExcluirContato(new ErroApi(0, 'rede'))).toBe(
      'Sem conexão. O contato não foi excluído. Tente de novo.',
    );
  });

  it('404 diz que nao encontrou o contato', () => {
    expect(mensagemDeErroAoExcluirContato(new ErroApi(404, 'x'))).toBe('Contato não encontrado.');
  });

  it('5xx fala do servidor e diz que nao foi excluido', () => {
    expect(mensagemDeErroAoExcluirContato(new ErroApi(500, 'x'))).toBe(
      'O servidor está com problemas. O contato não foi excluído. Tente de novo em instantes.',
    );
  });

  it('erro desconhecido vira frase generica', () => {
    expect(mensagemDeErroAoExcluirContato('boom')).toBe(
      'Não foi possível excluir o contato. Tente de novo.',
    );
  });
});
