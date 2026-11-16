import { criarClienteHttp } from '../cliente-http';
import { ErroApi } from '../erro';
import type { Contato } from '../types';
import { criarContatosApiReal } from './contatos-api-real';

// Contrato REAL do Java (ContatoEmergenciaController): os contatos ficam dentro do perfil de
// emergencia, em /api/v1/perfis-emergencia/{perfilId}/contatos, e o cidadao descobre o id do seu
// perfil em /api/v1/perfis-emergencia/meu. O fetch e simulado: so conferimos o que o app ENVIA e
// como trata o que RECEBE.
function resposta(status: number, corpo?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (corpo === undefined ? '' : JSON.stringify(corpo)),
  };
}

const PERFIL = { id: 7, cidadao: { id: 1, nome: 'Ana' }, mobilidade: 'CADEIRANTE' };

// Responde de acordo com a URL pedida: "/meu" devolve o perfil, o resto vem de "outras".
function fetchPorUrl(outras: Record<string, ReturnType<typeof resposta>>) {
  return jest.fn(async (url: string) => {
    if (url.endsWith('/api/v1/perfis-emergencia/meu')) return resposta(200, PERFIL);
    const achada = Object.entries(outras).find(([fim]) => url.endsWith(fim));
    if (!achada) throw new Error(`URL inesperada no teste: ${url}`);
    return achada[1];
  });
}

function criar(fetchSimulado: jest.Mock) {
  const cliente = criarClienteHttp({
    baseUrl: 'http://java.teste',
    obterToken: () => 'jwt-de-teste',
    fetchImpl: fetchSimulado as unknown as typeof fetch,
  });
  return criarContatosApiReal(cliente);
}

const contato: Contato = {
  id: 4,
  nome: 'Marina Souza',
  parentesco: 'filha',
  telefone: '+5511988887777',
  prioridade: 1,
};

describe('criarContatosApiReal', () => {
  it('listar acha o perfil em /meu e lista os contatos dele, convertendo a pagina (1 para 0)', async () => {
    // O Spring conta as paginas a partir de 0; o app, a partir de 1.
    const fetchSimulado = fetchPorUrl({
      '/api/v1/perfis-emergencia/7/contatos?page=1&size=2': resposta(200, {
        conteudo: [contato],
        pagina: 1,
        tamanho: 2,
        totalElementos: 3,
        totalPaginas: 2,
        ultima: true,
      }),
    });

    const pagina = await criar(fetchSimulado).listar(2, 2);

    const urls = fetchSimulado.mock.calls.map(([url]) => url);
    expect(urls).toEqual([
      'http://java.teste/api/v1/perfis-emergencia/meu',
      'http://java.teste/api/v1/perfis-emergencia/7/contatos?page=1&size=2',
    ]);
    expect(pagina).toEqual({ itens: [contato], pagina: 2, tamanho: 2, total: 3 });
  });

  it('manda o token em todos os pedidos', async () => {
    const fetchSimulado = fetchPorUrl({
      '/api/v1/perfis-emergencia/7/contatos?page=0&size=10': resposta(200, {
        conteudo: [],
        pagina: 0,
        tamanho: 10,
        totalElementos: 0,
        totalPaginas: 0,
        ultima: true,
      }),
    });

    await criar(fetchSimulado).listar(1, 10);

    for (const [, init] of fetchSimulado.mock.calls as unknown as [string, RequestInit][]) {
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-de-teste');
    }
  });

  it('sem perfil de emergencia (404 em /meu), listar devolve lista vazia em vez de erro', async () => {
    // No Java, so o cuidador cria o perfil: antes disso o cidadao simplesmente nao tem contatos.
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(404, { mensagem: 'sem perfil' }));

    const pagina = await criar(fetchSimulado).listar(1, 10);

    expect(pagina).toEqual({ itens: [], pagina: 1, tamanho: 10, total: 0 });
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
  });

  it('outros erros em /meu (ex.: 500) continuam sendo erro', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(500, { mensagem: 'falhou' }));

    const erro = await criar(fetchSimulado)
      .listar(1, 10)
      .catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroApi);
    expect(erro).toMatchObject({ status: 500 });
  });

  it('obter faz GET no contato dentro do perfil', async () => {
    const fetchSimulado = fetchPorUrl({
      '/api/v1/perfis-emergencia/7/contatos/4': resposta(200, contato),
    });

    expect(await criar(fetchSimulado).obter(4)).toEqual(contato);
    expect(fetchSimulado.mock.calls[1][0]).toBe(
      'http://java.teste/api/v1/perfis-emergencia/7/contatos/4',
    );
  });

  it('criar faz POST dentro do perfil, com os dados do contato, e devolve o contato criado', async () => {
    const dados = {
      nome: 'Marina Souza',
      telefone: '11988887777',
      parentesco: 'filha',
      prioridade: 1,
    };
    const fetchSimulado = fetchPorUrl({
      '/api/v1/perfis-emergencia/7/contatos': resposta(201, contato),
    });

    const criado = await criar(fetchSimulado).criar(dados);

    const [url, init] = fetchSimulado.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toBe('http://java.teste/api/v1/perfis-emergencia/7/contatos');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(dados);
    expect(criado).toEqual(contato);
  });

  it('editar faz PUT no contato e devolve o contato atualizado', async () => {
    const dados = { nome: 'Marina S.', telefone: '11988887777', parentesco: null, prioridade: 2 };
    const fetchSimulado = fetchPorUrl({
      '/api/v1/perfis-emergencia/7/contatos/4': resposta(200, { ...contato, nome: 'Marina S.' }),
    });

    const editado = await criar(fetchSimulado).editar(4, dados);

    const [url, init] = fetchSimulado.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toBe('http://java.teste/api/v1/perfis-emergencia/7/contatos/4');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual(dados);
    expect(editado.nome).toBe('Marina S.');
  });

  it('excluir faz DELETE no contato (resposta 204 sem corpo)', async () => {
    const fetchSimulado = fetchPorUrl({
      '/api/v1/perfis-emergencia/7/contatos/4': resposta(204),
    });

    await expect(criar(fetchSimulado).excluir(4)).resolves.toBeUndefined();

    const [url, init] = fetchSimulado.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toBe('http://java.teste/api/v1/perfis-emergencia/7/contatos/4');
    expect(init.method).toBe('DELETE');
  });

  it('criar repassa o 400 do Java', async () => {
    const fetchSimulado = fetchPorUrl({
      '/api/v1/perfis-emergencia/7/contatos': resposta(400, { mensagem: 'Dados inválidos' }),
    });

    const erro = await criar(fetchSimulado)
      .criar({ nome: 'A', telefone: '1', parentesco: null, prioridade: 1 })
      .catch((e: unknown) => e);

    expect(erro).toMatchObject({ status: 400 });
  });

  it('obter repassa o 404 de um contato que nao existe', async () => {
    const fetchSimulado = fetchPorUrl({
      '/api/v1/perfis-emergencia/7/contatos/99': resposta(404, { mensagem: 'nao existe' }),
    });

    const erro = await criar(fetchSimulado)
      .obter(99)
      .catch((e: unknown) => e);

    expect(erro).toMatchObject({ status: 404 });
  });
});
