import { criarClienteHttp } from '../cliente-http';
import { criarAtendimentosApiReal } from './atendimentos-api-real';

// O fetch e simulado: so conferimos o que o app ENVIA e como trata o que RECEBE.
function resposta(status: number, corpo?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (corpo === undefined ? '' : JSON.stringify(corpo)),
  };
}

describe('criarAtendimentosApiReal.proximos', () => {
  it('faz GET em /api/v1/atendimentos/proximos com tipo, ponto, acessibilidade e limite', async () => {
    const lista = { tipo: 'UBS', atendimentos: [], mensagemFalada: 'Não encontrei.' };
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(200, lista));
    const api = criarAtendimentosApiReal(
      criarClienteHttp({
        baseUrl: 'http://java.teste',
        obterToken: () => 'jwt-de-teste',
        fetchImpl: fetchSimulado as unknown as typeof fetch,
      }),
    );

    const resultado = await api.proximos({
      tipo: 'UBS',
      latitude: -23.52,
      longitude: -46.77,
      acessivel: true,
    });

    expect(resultado).toEqual(lista);
    const [url, opcoes] = fetchSimulado.mock.calls[0];
    expect(url).toBe(
      'http://java.teste/api/v1/atendimentos/proximos?tipo=UBS&latitude=-23.52&longitude=-46.77&acessivel=true&limite=3',
    );
    expect(opcoes.method).toBe('GET');
    expect(opcoes.headers.Authorization).toBe('Bearer jwt-de-teste');
  });
});
