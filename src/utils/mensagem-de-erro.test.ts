import { ErroApi } from '../services/api/erro';
import { mensagemDeErro } from './mensagem-de-erro';

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
