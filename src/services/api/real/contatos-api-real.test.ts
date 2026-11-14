import { criarClienteHttp } from '../cliente-http';
import { ErroApi } from '../erro';
import type { Contato, DadosContato } from '../types';
import { criarContatosApiReal } from './contatos-api-real';

// Mesmo contrato da API falsa (plano unico, secao 8.1), mas passando pelo cliente HTTP real.
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
  return criarContatosApiReal(cliente);
}

const dados: DadosContato = {
  nome: 'Marina Souza',
  apelido: 'filha',
  telefone: '(11) 98888-7777',
  prioridade: 1,
};

const contato: Contato = {
  id: 4,
  nome: 'Marina Souza',
  apelido: 'filha',
  telefone: '11988887777',
  prioridade: 1,
};

describe('criarContatosApiReal', () => {
  it('listar converte a pagina do app (1) para a do Spring (0) e de volta', async () => {
    // O Spring conta as paginas a partir de 0; o app, a partir de 1.
    const fetchSimulado = jest
      .fn()
      .mockResolvedValue(resposta(200, { itens: [contato], pagina: 1, tamanho: 2, total: 3 }));

    const pagina = await criar(fetchSimulado).listar(2, 2);

    const [url, init] = fetchSimulado.mock.calls[0];
    expect(url).toBe('http://java.teste/api/contatos?page=1&size=2');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer jwt-de-teste');
    expect(pagina).toEqual({ itens: [contato], pagina: 2, tamanho: 2, total: 3 });
  });

  it('obter faz GET em /api/contatos/{id}', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(200, contato));

    expect(await criar(fetchSimulado).obter(4)).toEqual(contato);
    expect(fetchSimulado.mock.calls[0][0]).toBe('http://java.teste/api/contatos/4');
  });

  it('criar faz POST com os dados no corpo', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(201, contato));

    expect(await criar(fetchSimulado).criar(dados)).toEqual(contato);
    const [url, init] = fetchSimulado.mock.calls[0];
    expect(url).toBe('http://java.teste/api/contatos');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(dados);
  });

  it('editar faz PUT em /api/contatos/{id}', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(200, contato));

    await criar(fetchSimulado).editar(4, dados);

    const [url, init] = fetchSimulado.mock.calls[0];
    expect(url).toBe('http://java.teste/api/contatos/4');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual(dados);
  });

  it('excluir faz DELETE em /api/contatos/{id}', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(204));

    await criar(fetchSimulado).excluir(4);

    const [url, init] = fetchSimulado.mock.calls[0];
    expect(url).toBe('http://java.teste/api/contatos/4');
    expect(init.method).toBe('DELETE');
  });

  it('repassa os erros por campo do 400 como ErroApi', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(
      resposta(400, {
        mensagem: 'Dados inválidos.',
        campos: [{ campo: 'telefone', mensagem: 'Telefone inválido.' }],
      }),
    );

    const erro = await criar(fetchSimulado)
      .criar(dados)
      .catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroApi);
    expect(erro).toMatchObject({ status: 400, campos: { telefone: 'Telefone inválido.' } });
  });
});
