import { criarClienteHttp } from '../cliente-http';
import { ErroApi } from '../erro';
import type { Categoria, DadosNovoReporte, Pagina, Reporte, ReporteResumo } from '../types';
import { criarReportesApiReal } from './reportes-api-real';

// Mesmo contrato da API falsa (plano unico, secao 8.2), mas passando pelo cliente HTTP real.
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
    baseUrl: 'http://dotnet.teste',
    obterToken: () => 'jwt-de-teste',
    fetchImpl: fetchSimulado as unknown as typeof fetch,
  });
  return criarReportesApiReal(cliente);
}

const categoria: Categoria = { id: 1, codigo: 'CALCADA', nome: 'Calçada quebrada' };

const dadosNovos: DadosNovoReporte = {
  categoriaId: 1,
  descricao: 'A calçada em frente ao número 120 está quebrada.',
  latitude: -23.55,
  longitude: -46.63,
  endereco: 'Rua das Flores, 120',
  fotoUrl: 'https://fotos.exemplo/1.jpg',
  urgencia: 'ALTA',
};

const reporte: Reporte = {
  id: 7,
  protocolo: 'VV-2026-000007',
  categoria,
  descricao: dadosNovos.descricao,
  urgencia: 'ALTA',
  status: 'ABERTO',
  criadoEm: '2026-11-13T12:00:00.000Z',
  latitude: -23.55,
  longitude: -46.63,
  atualizadoEm: '2026-11-13T12:00:00.000Z',
  historico: [{ statusAnterior: null, statusNovo: 'ABERTO', criadoEm: '2026-11-13T12:00:00.000Z' }],
};

describe('criarReportesApiReal', () => {
  it('listarCategorias faz GET em /api/categorias', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(200, [categoria]));

    const categorias = await criar(fetchSimulado).listarCategorias();

    expect(categorias).toEqual([categoria]);
    const [url, init] = fetchSimulado.mock.calls[0];
    expect(url).toBe('http://dotnet.teste/api/categorias');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer jwt-de-teste');
  });

  it('criar faz POST em /api/reportes com o corpo e o Idempotency-Key', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(201, reporte));

    const criado = await criar(fetchSimulado).criar(dadosNovos, 'chave-123');

    expect(criado).toEqual(reporte);
    const [url, init] = fetchSimulado.mock.calls[0];
    expect(url).toBe('http://dotnet.teste/api/reportes');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(dadosNovos);
    expect(init.headers['Idempotency-Key']).toBe('chave-123');
    expect(init.headers.Authorization).toBe('Bearer jwt-de-teste');
  });

  it('listarMeus faz GET em /api/reportes/meus com page e size', async () => {
    const resumo: ReporteResumo = {
      id: 7,
      protocolo: reporte.protocolo,
      categoria,
      descricao: reporte.descricao,
      urgencia: 'ALTA',
      status: 'ABERTO',
      criadoEm: reporte.criadoEm,
    };
    const pagina: Pagina<ReporteResumo> = { itens: [resumo], pagina: 2, tamanho: 10, total: 11 };
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(200, pagina));

    const resultado = await criar(fetchSimulado).listarMeus(2, 10);

    expect(resultado).toEqual(pagina);
    const [url, init] = fetchSimulado.mock.calls[0];
    expect(url).toBe('http://dotnet.teste/api/reportes/meus?page=2&size=10');
    expect(init.method).toBe('GET');
  });

  it('obter faz GET em /api/reportes/{id}', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(200, reporte));

    await expect(criar(fetchSimulado).obter(7)).resolves.toEqual(reporte);

    expect(fetchSimulado.mock.calls[0][0]).toBe('http://dotnet.teste/api/reportes/7');
  });

  it('editar faz PUT em /api/reportes/{id} com descricao e foto', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(200, reporte));

    await criar(fetchSimulado).editar(7, { descricao: 'Nova descricao completa.', fotoUrl: null });

    const [url, init] = fetchSimulado.mock.calls[0];
    expect(url).toBe('http://dotnet.teste/api/reportes/7');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ descricao: 'Nova descricao completa.', fotoUrl: null });
  });

  it('cancelar faz DELETE em /api/reportes/{id} e aceita 204 sem corpo', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(204));

    await expect(criar(fetchSimulado).cancelar(7)).resolves.toBeUndefined();

    const [url, init] = fetchSimulado.mock.calls[0];
    expect(url).toBe('http://dotnet.teste/api/reportes/7');
    expect(init.method).toBe('DELETE');
  });

  it('erro da API vira ErroApi (ex.: 409 ao editar reporte que nao esta mais aberto)', async () => {
    const fetchSimulado = jest
      .fn()
      .mockResolvedValue(resposta(409, { mensagem: 'O reporte não está mais em aberto.' }));

    const erro = await criar(fetchSimulado)
      .editar(7, { descricao: 'Tentando editar depois da hora.' })
      .catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroApi);
    expect(erro).toMatchObject({ status: 409, message: 'O reporte não está mais em aberto.' });
  });
});
