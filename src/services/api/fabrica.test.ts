import { criarApis, usarApiFalsaDoAmbiente } from './fabrica';

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
      'http://localhost:8080/api/auth/cadastro',
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
      'http://localhost:8080/api/auth/cadastro',
      expect.anything(),
    );
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
