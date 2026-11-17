import { ErroApi, ErroExclusaoParcial } from '../services/api/erro';
import { mensagemDeErro, mensagemDeErroAoExcluir } from './mensagem-de-erro';

describe('mensagemDeErroAoExcluir', () => {
  it('401 fala da sessão, não de e-mail e senha (o usuário já está logado)', () => {
    const msg = mensagemDeErroAoExcluir(new ErroApi(401, 'Unauthorized'));
    expect(msg).toBe('Sua sessão venceu. Entre de novo para excluir a conta.');
    expect(msg).not.toMatch(/senha/i);
  });

  it('sem conexão avisa que a conta continua existindo', () => {
    expect(mensagemDeErroAoExcluir(new ErroApi(0, 'Network request failed'))).toBe(
      'Sem conexão. A sua conta não foi excluída. Tente de novo.',
    );
  });

  it('servidor com problema avisa que a conta não foi excluída', () => {
    expect(mensagemDeErroAoExcluir(new ErroApi(503, 'Service Unavailable'))).toBe(
      'O servidor está com problemas. A sua conta não foi excluída. Tente de novo em instantes.',
    );
  });

  it('erro desconhecido vira mensagem genérica, sem detalhe técnico', () => {
    const msg = mensagemDeErroAoExcluir(new TypeError('Cannot read properties of undefined'));
    expect(msg).toBe('Algo deu errado. A sua conta não foi excluída. Tente de novo.');
    expect(msg).not.toMatch(/undefined|TypeError/);
  });

  it('exclusão parcial (reportes já apagados, conta não) diz a verdade e manda tentar de novo', () => {
    const msg = mensagemDeErroAoExcluir(new ErroExclusaoParcial(new ErroApi(503, 'Indisponível')));
    expect(msg).toBe(
      'Seus reportes foram apagados, mas a sua conta ainda não foi excluída. Toque em "Excluir minha conta" de novo.',
    );
    // Não pode repetir a frase das outras falhas, que seria mentira aqui.
    expect(msg).not.toMatch(/não foi excluída\. Tente/);
  });

  it('a mensagem de exclusão parcial é a mesma com ou sem conexão (o que importa é o que já sumiu)', () => {
    const semConexao = mensagemDeErroAoExcluir(new ErroExclusaoParcial(new ErroApi(0, 'rede')));
    const servidor = mensagemDeErroAoExcluir(new ErroExclusaoParcial(new ErroApi(500, 'erro')));
    expect(semConexao).toBe(servidor);
  });
});

describe('mensagemDeErro', () => {
  it('401 vira "e-mail ou senha incorretos"', () => {
    expect(mensagemDeErro(new ErroApi(401, 'Unauthorized'))).toBe('E-mail ou senha incorretos.');
  });

  it('409 vira "este e-mail já tem conta"', () => {
    expect(mensagemDeErro(new ErroApi(409, 'Conflict'))).toBe('Este e-mail já tem conta.');
  });

  it('status 0 (sem resposta) vira mensagem de conexão', () => {
    expect(mensagemDeErro(new ErroApi(0, 'Network request failed'))).toBe(
      'Sem conexão. Verifique a internet e tente de novo.',
    );
  });

  it('400 pede para conferir os dados', () => {
    expect(mensagemDeErro(new ErroApi(400, 'Bad Request'))).toBe(
      'Confira os dados e tente de novo.',
    );
  });

  it('erros 5xx falam em problema do servidor', () => {
    expect(mensagemDeErro(new ErroApi(503, 'Service Unavailable'))).toBe(
      'O servidor está com problemas. Tente de novo em instantes.',
    );
  });

  it('erro desconhecido vira mensagem genérica, sem vazar detalhe técnico', () => {
    const msg = mensagemDeErro(new TypeError('Cannot read properties of undefined'));
    expect(msg).toBe('Algo deu errado. Tente de novo.');
    expect(msg).not.toMatch(/undefined|TypeError/);
  });

  it('valor que nem é Error também vira mensagem genérica', () => {
    expect(mensagemDeErro('boom')).toBe('Algo deu errado. Tente de novo.');
  });
});
