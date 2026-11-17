import { criarApis, usarApiFalsaDoAmbiente } from './fabrica';

// O File do expo-file-system e nativo; no teste ele vira um Blob (o FormData do Node so aceita Blob).
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((uri: string) => Object.assign(new Blob(['x']), { uri })),
}));

const dadosCadastro = {
  nome: 'Maria',
  email: 'maria@exemplo.com',
  telefone: '11999999999',
  senha: 'Senha@123',
  role: 'CIDADAO' as const,
  consentimento: true,
};

function criarFetchFalso() {
  return jest.fn(
    async () =>
      new Response(JSON.stringify({ id: 1, nome: 'Maria', role: 'CIDADAO' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
}

describe('criarApis', () => {
  it('usa a API falsa em memoria, sem tocar na rede, quando usarApiFalsa e true', async () => {
    const fetchImpl = criarFetchFalso();
    const { auth } = criarApis({
      usarApiFalsa: true,
      urlJava: 'http://localhost:8080',
      urlDotnet: 'http://localhost:5000',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await auth.cadastrar(dadosCadastro);
    const sessao = await auth.login(dadosCadastro.email, dadosCadastro.senha);

    expect(sessao.usuario.nome).toBe('Maria');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('usa a API real, chamando a URL da API Java, quando usarApiFalsa e false', async () => {
    const fetchImpl = criarFetchFalso();
    const { auth } = criarApis({
      usarApiFalsa: false,
      urlJava: 'http://localhost:8080',
      urlDotnet: 'http://localhost:5000',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await auth.cadastrar(dadosCadastro);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/auth/cadastro',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('a API real envia o token devolvido por obterToken', async () => {
    const fetchImpl = criarFetchFalso();
    const { auth } = criarApis({
      usarApiFalsa: false,
      urlJava: 'http://localhost:8080',
      urlDotnet: 'http://localhost:5000',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      obterToken: () => 'abc123',
    });

    await auth.cadastrar(dadosCadastro);

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer abc123');
  });
});

describe('criarApis: reportes e fotos', () => {
  const urlJava = 'http://localhost:8080';
  const urlDotnet = 'http://localhost:5000';
  const foto = { uri: 'file:///tmp/f.jpg', nome: 'f.jpg', tipo: 'image/jpeg' };

  function criarFetchJson(corpo: unknown) {
    return jest.fn(
      async () =>
        new Response(JSON.stringify(corpo), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
  }

  it('na API falsa, reportes e fotos funcionam sem rede com o token do login', async () => {
    const fetchImpl = criarFetchFalso();
    let token: string | null = null;
    const { auth, reportes, fotos } = criarApis({
      usarApiFalsa: true,
      urlJava,
      urlDotnet,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      obterToken: () => token,
    });
    await auth.cadastrar(dadosCadastro);
    token = (await auth.login(dadosCadastro.email, dadosCadastro.senha)).token;

    const categorias = await reportes.listarCategorias();
    const enviada = await fotos.enviar(foto);

    expect(categorias.length).toBeGreaterThan(0);
    expect(enviada.fotoUrl).toBe(foto.uri);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('na API falsa, um token que nao vale avisa o app (como o 401 da API real)', async () => {
    const aoNaoAutorizado = jest.fn();
    const { reportes } = criarApis({
      usarApiFalsa: true,
      urlJava,
      urlDotnet,
      obterToken: () => 'token-velho',
      aoNaoAutorizado,
    });

    await expect(reportes.listarMeus(1, 10)).rejects.toMatchObject({ status: 401 });

    expect(aoNaoAutorizado).toHaveBeenCalledTimes(1);
  });

  it('na API real, reportes usam a URL do .NET e mandam o token', async () => {
    const fetchImpl = criarFetchJson([]);
    const { reportes } = criarApis({
      usarApiFalsa: false,
      urlJava,
      urlDotnet,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      obterToken: () => 'abc123',
    });

    await reportes.listarCategorias();

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:5000/api/categorias');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer abc123');
  });

  it('na API real, fotos usam a URL do .NET', async () => {
    const fetchImpl = criarFetchJson({ fotoUrl: 'https://fotos.exemplo/1.jpg' });
    const { fotos } = criarApis({
      usarApiFalsa: false,
      urlJava,
      urlDotnet,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await fotos.enviar(foto);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:5000/api/fotos');
    expect(init.method).toBe('POST');
  });

  it('na API real, o login continua indo para a URL do Java', async () => {
    const fetchImpl = criarFetchFalso();
    const { auth } = criarApis({
      usarApiFalsa: false,
      urlJava,
      urlDotnet,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await auth.cadastrar(dadosCadastro);

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/auth/cadastro',
      expect.anything(),
    );
  });

  it('na API real, excluirConta apaga no .NET e depois no Java, cada um na sua URL', async () => {
    const fetchImpl = jest.fn(
      async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 }),
    );
    const { auth } = criarApis({
      usarApiFalsa: false,
      urlJava,
      urlDotnet,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await auth.excluirConta('jwt-de-teste');

    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      `${urlDotnet}/api/usuarios/eu`,
      `${urlJava}/api/v1/auth/eu`,
    ]);
  });

  it('na API real, um 401 do .NET com token avisa o app', async () => {
    const aoNaoAutorizado = jest.fn();
    const fetchImpl = jest.fn(async () => new Response('', { status: 401 }));
    const { reportes } = criarApis({
      usarApiFalsa: false,
      urlJava,
      urlDotnet,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      obterToken: () => 'vencido',
      aoNaoAutorizado,
    });

    await reportes.listarMeus(1, 10).catch(() => undefined);

    expect(aoNaoAutorizado).toHaveBeenCalledTimes(1);
  });
});

describe('usarApiFalsaDoAmbiente', () => {
  it('so e verdadeiro para o texto exato "true"', () => {
    expect(usarApiFalsaDoAmbiente('true')).toBe(true);
    expect(usarApiFalsaDoAmbiente('false')).toBe(false);
    expect(usarApiFalsaDoAmbiente('TRUE')).toBe(false);
    expect(usarApiFalsaDoAmbiente(undefined)).toBe(false);
  });
});

describe('criarApis: contatos', () => {
  const urlJava = 'http://localhost:8080';
  const urlDotnet = 'http://localhost:5000';

  it('na API falsa, contatos funcionam sem rede com o token do login', async () => {
    const fetchImpl = jest.fn();
    let token: string | null = null;
    const { auth, contatos } = criarApis({
      usarApiFalsa: true,
      urlJava,
      urlDotnet,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      obterToken: () => token,
    });
    await auth.cadastrar(dadosCadastro);
    token = (await auth.login(dadosCadastro.email, dadosCadastro.senha)).token;

    // Como no Java, sem perfil de emergencia a lista vem vazia e nao da para criar contato.
    expect((await contatos.listar(1, 10)).total).toBe(0);
    await expect(
      contatos.criar({ nome: 'Joana', telefone: '11955554444', parentesco: null, prioridade: 1 }),
    ).rejects.toMatchObject({ status: 404 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('na API falsa, depois de criar o perfil o cidadao ja pode ter contatos', async () => {
    let token: string | null = null;
    const { auth, perfis, contatos } = criarApis({
      usarApiFalsa: true,
      urlJava,
      urlDotnet,
      obterToken: () => token,
    });
    await auth.cadastrar(dadosCadastro);
    token = (await auth.login(dadosCadastro.email, dadosCadastro.senha)).token;
    await perfis.criar({
      mobilidade: 'NAO_INFORMADO',
      condicoesSaude: null,
      medicamentos: null,
      observacoes: null,
    });

    await contatos.criar({
      nome: 'Joana',
      telefone: '11955554444',
      parentesco: null,
      prioridade: 1,
    });

    expect((await contatos.listar(1, 10)).total).toBe(1);
  });

  it('na API real, perfis usam a URL do Java e mandam o token', async () => {
    const fetchImpl = jest.fn(
      async () =>
        new Response(JSON.stringify({ id: 7 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    const { perfis } = criarApis({
      usarApiFalsa: false,
      urlJava,
      urlDotnet,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      obterToken: () => 'abc123',
    });

    await perfis.meu();

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:8080/api/v1/perfis-emergencia/meu');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer abc123');
  });

  it('na API real, contatos usam a URL do Java (perfil em /meu) e mandam o token', async () => {
    const json = (corpo: unknown) =>
      new Response(JSON.stringify(corpo), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    const fetchImpl = jest.fn(async (url: string) =>
      url.endsWith('/meu')
        ? json({ id: 7 })
        : json({
            conteudo: [],
            pagina: 0,
            tamanho: 10,
            totalElementos: 0,
            totalPaginas: 0,
            ultima: true,
          }),
    );
    const { contatos } = criarApis({
      usarApiFalsa: false,
      urlJava,
      urlDotnet,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      obterToken: () => 'abc123',
    });

    await contatos.listar(1, 10);

    const chamadas = fetchImpl.mock.calls as unknown as [string, RequestInit][];
    expect(chamadas[0][0]).toBe('http://localhost:8080/api/v1/perfis-emergencia/meu');
    expect(chamadas[1][0]).toBe(
      'http://localhost:8080/api/v1/perfis-emergencia/7/contatos?page=0&size=10',
    );
    expect((chamadas[1][1].headers as Record<string, string>).Authorization).toBe('Bearer abc123');
  });
});

describe('criarApis: assistente', () => {
  const urlJava = 'http://localhost:8080';
  const urlDotnet = 'http://localhost:5000';

  it('na API falsa, o assistente funciona sem rede com o token do login', async () => {
    const fetchImpl = jest.fn();
    let token: string | null = null;
    const { auth, assistente } = criarApis({
      usarApiFalsa: true,
      urlJava,
      urlDotnet,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      obterToken: () => token,
    });
    await auth.cadastrar(dadosCadastro);
    token = (await auth.login(dadosCadastro.email, dadosCadastro.senha)).token;

    const resposta = await assistente.interpretar({ texto: 'socorro' });

    expect(resposta.intencao).toBe('SOCORRO');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('na API real, o assistente usa a URL do Java e manda o token', async () => {
    const fetchImpl = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            intencao: 'DESCONHECIDA',
            mensagemFalada: 'Pode repetir?',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    const { assistente } = criarApis({
      usarApiFalsa: false,
      urlJava,
      urlDotnet,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      obterToken: () => 'abc123',
    });

    await assistente.interpretar({ texto: 'oi' });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:8080/api/v1/voz/intencoes');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer abc123');
  });
});
