import { criarClienteHttp } from './cliente-http';
import { ErroApi } from './erro';

// O "fetch" aqui e simulado: devolve respostas prontas, sem rede. Assim testamos so a logica do
// cliente (cabecalhos, conversao da resposta e erros), como diz o ADR 0002.
function resposta(status: number, corpo?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (corpo === undefined ? '' : JSON.stringify(corpo)),
  };
}

function respostaTexto(status: number, texto: string) {
  return { ok: status >= 200 && status < 300, status, text: async () => texto };
}

function criar(
  fetchSimulado: jest.Mock,
  extras: Partial<Parameters<typeof criarClienteHttp>[0]> = {},
) {
  return criarClienteHttp({
    baseUrl: 'http://api.teste',
    fetchImpl: fetchSimulado as unknown as typeof fetch,
    ...extras,
  });
}

describe('criarClienteHttp', () => {
  it('chama baseUrl + caminho e devolve o JSON da resposta', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(200, { ok: true }));

    const dados = await criar(fetchSimulado).get<{ ok: boolean }>('/api/ping');

    expect(dados).toEqual({ ok: true });
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSimulado.mock.calls[0];
    expect(url).toBe('http://api.teste/api/ping');
    expect(init.method).toBe('GET');
  });

  it('nao duplica a barra quando a baseUrl termina com "/"', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(200, {}));

    await criar(fetchSimulado, { baseUrl: 'http://api.teste/' }).get('/api/ping');

    expect(fetchSimulado.mock.calls[0][0]).toBe('http://api.teste/api/ping');
  });

  it('envia o corpo como JSON com Content-Type no POST', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(201, { id: 1 }));

    await criar(fetchSimulado).post('/api/x', { nome: 'Ana' });

    const [, init] = fetchSimulado.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ nome: 'Ana' }));
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('manda o token em Authorization: Bearer quando existe', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(200, {}));

    await criar(fetchSimulado, { obterToken: () => 'abc123' }).get('/api/x');

    expect(fetchSimulado.mock.calls[0][1].headers.Authorization).toBe('Bearer abc123');
  });

  it('usa o token passado na chamada no lugar do obterToken', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(204));

    await criar(fetchSimulado, { obterToken: () => 'da-sessao' }).delete('/api/x', {
      token: 'da-chamada',
    });

    expect(fetchSimulado.mock.calls[0][1].headers.Authorization).toBe('Bearer da-chamada');
  });

  it('nao manda Authorization quando nao ha token', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(200, {}));

    await criar(fetchSimulado, { obterToken: () => null }).get('/api/x');

    expect(fetchSimulado.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('devolve undefined quando a resposta nao tem corpo (204)', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(204));

    const dados = await criar(fetchSimulado).delete('/api/x');

    expect(dados).toBeUndefined();
  });

  it('converte erro da API em ErroApi com status, mensagem e campos', async () => {
    // Formato do Java (plano unico, 8.1): { timestamp, status, erro, mensagem, campos[] }.
    // Suposicao: cada item de campos[] e { campo, mensagem } (confirmar com quem faz a API Java).
    const fetchSimulado = jest.fn().mockResolvedValue(
      resposta(400, {
        status: 400,
        erro: 'Bad Request',
        mensagem: 'Dados inválidos.',
        campos: [{ campo: 'email', mensagem: 'E-mail inválido.' }],
      }),
    );

    const erro = await criar(fetchSimulado)
      .post('/api/x', {})
      .catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroApi);
    expect(erro).toMatchObject({
      status: 400,
      message: 'Dados inválidos.',
      campos: { email: 'E-mail inválido.' },
    });
  });

  it('usa mensagem padrao quando o erro nao vem em JSON', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(respostaTexto(500, '<html>Oops</html>'));

    const erro = await criar(fetchSimulado)
      .get('/api/x')
      .catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroApi);
    expect((erro as ErroApi).status).toBe(500);
    expect((erro as ErroApi).message).toBe('Algo deu errado no servidor. Tente de novo.');
  });

  it('vira ErroApi com status 0 quando nao ha conexao', async () => {
    const fetchSimulado = jest.fn().mockRejectedValue(new TypeError('Network request failed'));

    const erro = await criar(fetchSimulado)
      .get('/api/x')
      .catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroApi);
    expect((erro as ErroApi).status).toBe(0);
    expect((erro as ErroApi).message).toBe('Sem conexão. Verifique a internet e tente de novo.');
  });

  it('avisa aoNaoAutorizado quando um 401 chega numa requisicao com token', async () => {
    const fetchSimulado = jest
      .fn()
      .mockResolvedValue(resposta(401, { mensagem: 'Token vencido.' }));
    const aoNaoAutorizado = jest.fn();

    const erro = await criar(fetchSimulado, { obterToken: () => 'velho', aoNaoAutorizado })
      .get('/api/x')
      .catch((e: unknown) => e);

    expect(aoNaoAutorizado).toHaveBeenCalledTimes(1);
    expect((erro as ErroApi).status).toBe(401);
  });

  it('envia o corpo como JSON no PUT (editar)', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(200, { id: 7 }));

    await criar(fetchSimulado).put('/api/reportes/7', { descricao: 'Nova' });

    const [url, init] = fetchSimulado.mock.calls[0];
    expect(url).toBe('http://api.teste/api/reportes/7');
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(JSON.stringify({ descricao: 'Nova' }));
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  // O Idempotency-Key do POST /api/reportes (plano unico, 8.2) vai como cabecalho da chamada.
  it('manda os cabecalhos extras da chamada, como o Idempotency-Key', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(201, { id: 1 }));

    await criar(fetchSimulado, { obterToken: () => 'abc' }).post(
      '/api/reportes',
      { descricao: 'Buraco' },
      { cabecalhos: { 'Idempotency-Key': 'chave-1' } },
    );

    const headers = fetchSimulado.mock.calls[0][1].headers;
    expect(headers['Idempotency-Key']).toBe('chave-1');
    expect(headers.Authorization).toBe('Bearer abc');
    expect(headers['Content-Type']).toBe('application/json');
  });

  describe('enviarArquivo (foto do reporte)', () => {
    afterEach(() => jest.restoreAllMocks());

    const foto = { uri: 'file:///tmp/foto.jpg', nome: 'foto.jpg', tipo: 'image/jpeg' };

    it('envia multipart com o arquivo no campo "arquivo" e devolve o JSON', async () => {
      const adicionar = jest.spyOn(FormData.prototype, 'append');
      const fetchSimulado = jest
        .fn()
        .mockResolvedValue(resposta(201, { fotoUrl: 'https://x/f.jpg' }));

      const dados = await criar(fetchSimulado).enviarArquivo<{ fotoUrl: string }>(
        '/api/fotos',
        foto,
      );

      expect(dados).toEqual({ fotoUrl: 'https://x/f.jpg' });
      const [url, init] = fetchSimulado.mock.calls[0];
      expect(url).toBe('http://api.teste/api/fotos');
      expect(init.method).toBe('POST');
      expect(init.body).toBeInstanceOf(FormData);
      // No React Native o arquivo entra como { uri, name, type }. O FormData do Jest (do Node) nao
      // guarda esse objeto, entao o teste confere o que foi passado ao append.
      expect(adicionar).toHaveBeenCalledTimes(1);
      expect(adicionar).toHaveBeenCalledWith('arquivo', {
        uri: foto.uri,
        name: foto.nome,
        type: foto.tipo,
      });
    });

    // Sem Content-Type de proposito: o fetch precisa montar o "boundary" do multipart sozinho.
    it('nao fixa o Content-Type e manda o token', async () => {
      const fetchSimulado = jest.fn().mockResolvedValue(resposta(201, {}));

      await criar(fetchSimulado, { obterToken: () => 'abc' }).enviarArquivo('/api/fotos', foto);

      const headers = fetchSimulado.mock.calls[0][1].headers;
      expect(headers['Content-Type']).toBeUndefined();
      expect(headers.Authorization).toBe('Bearer abc');
    });

    it('trata erro como nas outras chamadas (ErroApi e 401 avisa o app)', async () => {
      const fetchSimulado = jest.fn().mockResolvedValue(resposta(401, { mensagem: 'Vencido.' }));
      const aoNaoAutorizado = jest.fn();

      const erro = await criar(fetchSimulado, { obterToken: () => 'velho', aoNaoAutorizado })
        .enviarArquivo('/api/fotos', foto)
        .catch((e: unknown) => e);

      expect(erro).toBeInstanceOf(ErroApi);
      expect((erro as ErroApi).status).toBe(401);
      expect(aoNaoAutorizado).toHaveBeenCalledTimes(1);
    });
  });

  it('nao chama aoNaoAutorizado no 401 de uma requisicao sem token (ex.: senha errada no login)', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(401, { mensagem: 'Senha errada.' }));
    const aoNaoAutorizado = jest.fn();

    await criar(fetchSimulado, { obterToken: () => null, aoNaoAutorizado })
      .post('/api/auth/login', {})
      .catch(() => undefined);

    expect(aoNaoAutorizado).not.toHaveBeenCalled();
  });
});
