import { ErroApi } from '../services/api/erro';
import {
  mensagemDeErroAoCancelar,
  mensagemDeErroAoCarregar,
  mensagemDeErroAoEditar,
  mensagemDeErroDaFoto,
  mensagemDeErroDoReporte,
} from './mensagem-de-erro';

describe('mensagemDeErroAoCarregar', () => {
  it('sem conexao: sugere verificar a internet', () => {
    expect(mensagemDeErroAoCarregar(new ErroApi(0, 'x'))).toBe(
      'Sem conexão. Verifique a internet e tente de novo.',
    );
  });

  it('404: o reporte nao existe (ou nao e da pessoa)', () => {
    expect(mensagemDeErroAoCarregar(new ErroApi(404, 'x'))).toBe('Reporte não encontrado.');
  });

  it('erro do servidor', () => {
    expect(mensagemDeErroAoCarregar(new ErroApi(500, 'x'))).toBe(
      'O servidor está com problemas. Tente de novo em instantes.',
    );
  });

  it('qualquer outro erro: frase generica, nunca o texto tecnico', () => {
    const generica = 'Não foi possível carregar. Tente de novo.';
    expect(mensagemDeErroAoCarregar(new ErroApi(400, 'Stack trace secreto'))).toBe(generica);
    expect(mensagemDeErroAoCarregar(new Error('TypeError: x'))).toBe(generica);
  });
});

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

  it('409: o mesmo envio ainda esta sendo processado, nao precisa reenviar', () => {
    expect(mensagemDeErroDoReporte(new ErroApi(409, 'x'))).toBe(
      'O seu reporte ainda está sendo enviado. Espere um instante e confira em "Meus reportes".',
    );
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

  it('413: a foto e grande demais (limite de 5 MB da API)', () => {
    expect(mensagemDeErroDaFoto(new ErroApi(413, 'x'))).toBe(
      'A foto é grande demais. Escolha outra, de até 5 MB.',
    );
  });

  it('429: muitas fotos em pouco tempo, pede para esperar', () => {
    expect(mensagemDeErroDaFoto(new ErroApi(429, 'x'))).toBe(
      'Muitas fotos em pouco tempo. A foto não foi enviada. Espere um minuto e tente de novo.',
    );
  });

  it('409: o reporte ja nao esta em aberto ou mudou, a foto NAO foi enviada', () => {
    expect(mensagemDeErroDaFoto(new ErroApi(409, 'x'))).toBe(
      'Este reporte já não aceita foto, porque mudou ou não está mais em aberto. A foto não foi enviada.',
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

describe('mensagemDeErroAoEditar', () => {
  it('sem conexao: diz que as mudancas NAO foram salvas', () => {
    expect(mensagemDeErroAoEditar(new ErroApi(0, 'x'))).toBe(
      'Sem conexão. As suas mudanças não foram salvas. Tente de novo.',
    );
  });

  it('409: o reporte ja nao esta em aberto', () => {
    expect(mensagemDeErroAoEditar(new ErroApi(409, 'x'))).toBe(
      'Este reporte já não está em aberto e não pode mais ser editado.',
    );
  });

  it('404: reporte nao encontrado', () => {
    expect(mensagemDeErroAoEditar(new ErroApi(404, 'x'))).toBe('Reporte não encontrado.');
  });

  it('400 e 422: pede para conferir os dados', () => {
    expect(mensagemDeErroAoEditar(new ErroApi(400, 'x'))).toBe(
      'Confira os dados do reporte e tente de novo.',
    );
  });

  it('erro do servidor e generico: nunca o texto tecnico', () => {
    expect(mensagemDeErroAoEditar(new ErroApi(500, 'x'))).toBe(
      'O servidor está com problemas. As suas mudanças não foram salvas. Tente de novo em instantes.',
    );
    expect(mensagemDeErroAoEditar(new Error('TypeError: x'))).toBe(
      'Não foi possível salvar as mudanças. Tente de novo.',
    );
  });
});

describe('mensagemDeErroAoCancelar', () => {
  it('sem conexao: diz que o reporte NAO foi cancelado', () => {
    expect(mensagemDeErroAoCancelar(new ErroApi(0, 'x'))).toBe(
      'Sem conexão. O reporte não foi cancelado. Tente de novo.',
    );
  });

  it('409: o status mudou e ja nao da para cancelar', () => {
    expect(mensagemDeErroAoCancelar(new ErroApi(409, 'x'))).toBe(
      'Este reporte já não está em aberto e não pode mais ser cancelado.',
    );
  });

  it('404: reporte nao encontrado', () => {
    expect(mensagemDeErroAoCancelar(new ErroApi(404, 'x'))).toBe('Reporte não encontrado.');
  });

  it('erro do servidor e generico', () => {
    expect(mensagemDeErroAoCancelar(new ErroApi(503, 'x'))).toBe(
      'O servidor está com problemas. O reporte não foi cancelado. Tente de novo em instantes.',
    );
    expect(mensagemDeErroAoCancelar(new Error('boom'))).toBe(
      'Não foi possível cancelar o reporte. Tente de novo.',
    );
  });
});
