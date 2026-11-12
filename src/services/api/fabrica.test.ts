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
      fetchImpl: fetchImpl as unknown as typeof fetch,
      obterToken: () => 'abc123',
    });

    await auth.cadastrar(dadosCadastro);

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer abc123');
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
