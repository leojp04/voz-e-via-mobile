import { ErroApi } from '../services/api/erro';
import { mensagemDeErroDaFoto, mensagemDeErroDoReporte } from './mensagem-de-erro';

describe('mensagemDeErroDoReporte', () => {
  it('sem conexao: diz que o reporte NAO foi enviado', () => {
    expect(mensagemDeErroDoReporte(new ErroApi(0, 'x'))).toBe(
      'Sem conexão. O seu reporte não foi enviado. Tente de novo.',
    );
  });

  it('429: pede para esperar um pouco', () => {
    expect(mensagemDeErroDoReporte(new ErroApi(429, 'x'))).toBe(
      'Muitos reportes em pouco tempo. Espere um minuto e tente de novo.',
    );
  });

  it('400 e 422: pede para conferir os dados', () => {
    const esperado = 'Confira os dados do reporte e tente de novo.';
    expect(mensagemDeErroDoReporte(new ErroApi(400, 'x'))).toBe(esperado);
    expect(mensagemDeErroDoReporte(new ErroApi(422, 'x'))).toBe(esperado);
  });

  it('erro do servidor: avisa que o reporte nao foi enviado', () => {
    expect(mensagemDeErroDoReporte(new ErroApi(503, 'x'))).toBe(
      'O servidor está com problemas. O seu reporte não foi enviado. Tente de novo em instantes.',
    );
  });

  it('qualquer outro erro: frase generica, nunca o texto tecnico', () => {
    const generica = 'Não foi possível enviar o reporte. Tente de novo.';
    expect(mensagemDeErroDoReporte(new ErroApi(404, 'Stack trace secreto'))).toBe(generica);
    expect(mensagemDeErroDoReporte(new Error('TypeError: undefined is not a function'))).toBe(
      generica,
    );
  });
});

describe('mensagemDeErroDaFoto', () => {
  it('sem conexao: diz que a foto NAO foi enviada', () => {
    expect(mensagemDeErroDaFoto(new ErroApi(0, 'x'))).toBe(
      'Sem conexão. A foto não foi enviada. Tente de novo.',
    );
  });

  it('400: a foto nao foi aceita, sugere outra em JPEG ou PNG', () => {
    expect(mensagemDeErroDaFoto(new ErroApi(400, 'x'))).toBe(
      'A foto não foi aceita. Escolha outra, em JPEG ou PNG.',
    );
  });

  it('erro do servidor', () => {
    expect(mensagemDeErroDaFoto(new ErroApi(500, 'x'))).toBe(
      'O servidor está com problemas. A foto não foi enviada. Tente de novo em instantes.',
    );
  });

  it('qualquer outro erro: frase generica', () => {
    expect(mensagemDeErroDaFoto(new Error('boom'))).toBe(
      'Não foi possível enviar a foto. Tente de novo.',
    );
  });
});
