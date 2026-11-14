import { ErroApi } from '../services/api/erro';
import { mensagemDeErroDoAssistente } from './mensagem-de-erro';

// Toda frase diz que NADA foi feito: o assistente so sugere, mas a pessoa precisa saber que
// nenhum reporte, ligacao ou alerta saiu por causa do erro.
describe('mensagemDeErroDoAssistente', () => {
  it('sem conexão avisa que nada foi feito', () => {
    expect(mensagemDeErroDoAssistente(new ErroApi(0, 'Network request failed'))).toBe(
      'Sem conexão. Nada foi feito. Tente de novo.',
    );
  });

  it('400 pede para escrever de outro jeito', () => {
    expect(mensagemDeErroDoAssistente(new ErroApi(400, 'Bad Request'))).toBe(
      'Não consegui entender o que você escreveu. Nada foi feito. Tente com outras palavras.',
    );
  });

  it('401 fala da sessão', () => {
    expect(mensagemDeErroDoAssistente(new ErroApi(401, 'Unauthorized'))).toBe(
      'Sua sessão venceu. Entre de novo.',
    );
  });

  it('erros 5xx falam em problema do servidor', () => {
    expect(mensagemDeErroDoAssistente(new ErroApi(503, 'Service Unavailable'))).toBe(
      'O servidor está com problemas. Nada foi feito. Tente de novo em instantes.',
    );
  });

  it('erro desconhecido vira frase genérica, sem vazar detalhe técnico', () => {
    const msg = mensagemDeErroDoAssistente(new TypeError('Cannot read properties of undefined'));
    expect(msg).toBe('Não foi possível falar com o assistente. Nada foi feito. Tente de novo.');
    expect(msg).not.toMatch(/undefined|TypeError/);
  });
});
