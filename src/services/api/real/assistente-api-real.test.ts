import { criarClienteHttp } from '../cliente-http';
import { ErroApi } from '../erro';
import { criarAssistenteApiReal } from './assistente-api-real';

// O fetch e simulado: so conferimos o que o app ENVIA e como trata o que RECEBE.
function resposta(status: number, corpo?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (corpo === undefined ? '' : JSON.stringify(corpo)),
  };
}

function criar(fetchSimulado: jest.Mock) {
  const cliente = criarClienteHttp({
    baseUrl: 'http://java.teste',
    obterToken: () => 'jwt-de-teste',
    fetchImpl: fetchSimulado as unknown as typeof fetch,
  });
  return criarAssistenteApiReal(cliente);
}

const respostaDoPlano = {
  intencao: 'REPORTAR_PROBLEMA',
  parametros: {
    categoria: 'CALCADA',
    urgencia: 'ALTA',
    descricao: 'Calçada quebrada em frente ao local; risco de queda',
  },
  respostaFalada: 'Entendi. Vou registrar uma calçada quebrada com urgência alta. Posso confirmar?',
  precisaConfirmacao: true,
  fontes: [],
};

describe('criarAssistenteApiReal', () => {
  it('interpretar faz POST em /api/assistente/interpretar com o texto e o token', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(200, respostaDoPlano));

    const resultado = await criar(fetchSimulado).interpretar({
      texto: 'a calçada aqui na frente está toda quebrada',
      latitude: -23.5,
      longitude: -46.6,
    });

    const [url, init] = fetchSimulado.mock.calls[0];
    expect(url).toBe('http://java.teste/api/assistente/interpretar');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer jwt-de-teste');
    expect(JSON.parse(init.body)).toEqual({
      texto: 'a calçada aqui na frente está toda quebrada',
      latitude: -23.5,
      longitude: -46.6,
    });
    expect(resultado).toEqual(respostaDoPlano);
  });

  it('uma intencao fora da lista chega como NAO_ENTENDI', async () => {
    const fetchSimulado = jest
      .fn()
      .mockResolvedValue(resposta(200, { ...respostaDoPlano, intencao: 'APAGAR_TUDO' }));

    const resultado = await criar(fetchSimulado).interpretar({ texto: 'qualquer coisa' });

    expect(resultado.intencao).toBe('NAO_ENTENDI');
  });

  it('campos que faltam na resposta viram valores seguros', async () => {
    const fetchSimulado = jest
      .fn()
      .mockResolvedValue(
        resposta(200, { intencao: 'EMERGENCIA', respostaFalada: 'Posso pedir ajuda?' }),
      );

    const resultado = await criar(fetchSimulado).interpretar({ texto: 'socorro' });

    expect(resultado).toEqual({
      intencao: 'EMERGENCIA',
      parametros: {},
      respostaFalada: 'Posso pedir ajuda?',
      fontes: [],
      precisaConfirmacao: true,
    });
  });

  it('propaga o erro da API (400 com texto vazio)', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(400, { mensagem: 'Texto vazio.' }));

    await expect(criar(fetchSimulado).interpretar({ texto: '' })).rejects.toBeInstanceOf(ErroApi);
  });
});
