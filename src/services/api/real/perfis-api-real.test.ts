import { criarClienteHttp } from '../cliente-http';
import { ErroApi } from '../erro';
import type { DadosPerfil, PerfilEmergencia } from '../types';
import { criarPerfisApiReal } from './perfis-api-real';

// Contrato REAL do Java (PerfilEmergenciaController): o cidadao acha o proprio perfil em
// GET /api/v1/perfis-emergencia/meu (404 se ainda nao tem), cria em POST /api/v1/perfis-emergencia
// (sem cidadaoEmail: vale o dono do token) e edita em PUT /api/v1/perfis-emergencia/{id}.
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
  return criarPerfisApiReal(cliente);
}

const perfil: PerfilEmergencia = {
  id: 7,
  mobilidade: 'NAO_INFORMADO',
  condicoesSaude: 'Hipertensão',
  medicamentos: null,
  observacoes: null,
};

const dados: DadosPerfil = {
  mobilidade: 'NAO_INFORMADO',
  condicoesSaude: 'Hipertensão',
  medicamentos: null,
  observacoes: null,
};

describe('criarPerfisApiReal', () => {
  it('meu faz GET em /meu com o token e devolve o perfil', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(200, perfil));

    const achado = await criar(fetchSimulado).meu();

    const [url, init] = fetchSimulado.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://java.teste/api/v1/perfis-emergencia/meu');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-de-teste');
    expect(achado).toMatchObject({ id: 7, condicoesSaude: 'Hipertensão' });
  });

  it('meu devolve null quando a pessoa ainda nao tem perfil (404)', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(404, { mensagem: 'sem perfil' }));
    expect(await criar(fetchSimulado).meu()).toBeNull();
  });

  it('meu repassa os outros erros (ex.: 500)', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(500, { mensagem: 'falhou' }));

    const erro = await criar(fetchSimulado)
      .meu()
      .catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroApi);
    expect(erro).toMatchObject({ status: 500 });
  });

  it('criar faz POST com os dados, sem cidadaoEmail, e devolve o perfil criado', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(201, perfil));

    const criado = await criar(fetchSimulado).criar(dados);

    const [url, init] = fetchSimulado.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://java.teste/api/v1/perfis-emergencia');
    expect(init.method).toBe('POST');
    const corpo = JSON.parse(init.body as string);
    expect(corpo).toEqual(dados);
    expect(corpo).not.toHaveProperty('cidadaoEmail');
    expect(criado.id).toBe(7);
  });

  it('criar repassa o 409 de quem ja tem perfil', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(409, { mensagem: 'ja existe' }));

    const erro = await criar(fetchSimulado)
      .criar(dados)
      .catch((e: unknown) => e);

    expect(erro).toMatchObject({ status: 409 });
  });

  it('atualizar faz PUT no perfil e devolve o perfil atualizado', async () => {
    const novos: DadosPerfil = { ...dados, mobilidade: 'BENGALA', medicamentos: 'Losartana' };
    const fetchSimulado = jest
      .fn()
      .mockResolvedValue(resposta(200, { ...perfil, mobilidade: 'BENGALA' }));

    const atualizado = await criar(fetchSimulado).atualizar(7, novos);

    const [url, init] = fetchSimulado.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://java.teste/api/v1/perfis-emergencia/7');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual(novos);
    expect(atualizado.mobilidade).toBe('BENGALA');
  });
});
