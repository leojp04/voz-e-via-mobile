import { criarClienteHttp } from '../cliente-http';
import { ErroApi } from '../erro';
import { criarFotosApiReal } from './fotos-api-real';

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
  return criarFotosApiReal(cliente, 'http://dotnet.teste');
}

const foto = { uri: 'file:///tmp/foto.jpg', nome: 'foto.jpg', tipo: 'image/jpeg' };

describe('criarFotosApiReal', () => {
  afterEach(() => jest.restoreAllMocks());

  it('enviar faz POST multipart em /api/fotos e devolve a fotoUrl', async () => {
    const adicionar = jest.spyOn(FormData.prototype, 'append');
    const fetchSimulado = jest
      .fn()
      .mockResolvedValue(resposta(201, { fotoUrl: '/uploads/abc.jpg' }));

    const resultado = await criar(fetchSimulado).enviar(foto);

    expect(resultado).toEqual({ fotoUrl: 'http://dotnet.teste/uploads/abc.jpg' });
    const [url, init] = fetchSimulado.mock.calls[0];
    expect(url).toBe('http://dotnet.teste/api/fotos');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer jwt-de-teste');
    expect(adicionar).toHaveBeenCalledWith('arquivo', {
      uri: foto.uri,
      name: foto.nome,
      type: foto.tipo,
    });
  });

  it('erro da API vira ErroApi (ex.: 400 para um tipo de arquivo nao aceito)', async () => {
    const fetchSimulado = jest
      .fn()
      .mockResolvedValue(resposta(400, { mensagem: 'Envie uma foto JPEG ou PNG.' }));

    const erro = await criar(fetchSimulado)
      .enviar(foto)
      .catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroApi);
    expect(erro).toMatchObject({ status: 400, message: 'Envie uma foto JPEG ou PNG.' });
  });
});
