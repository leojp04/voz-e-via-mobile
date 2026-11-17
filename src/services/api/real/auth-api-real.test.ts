import { criarClienteHttp } from '../cliente-http';
import { ErroApi, ErroExclusaoParcial } from '../erro';
import type { DadosCadastro, Sessao } from '../types';
import { criarAuthApiReal } from './auth-api-real';

// Mesmo contrato da API falsa (plano unico, secao 6 e 8.1), mas passando pelo cliente HTTP real.
// O fetch e simulado: so conferimos o que o app ENVIA e como trata o que RECEBE.
function resposta(status: number, corpo?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (corpo === undefined ? '' : JSON.stringify(corpo)),
  };
}

// A exclusao de conta fala com DUAS APIs (primeiro o .NET, depois o Java), entao cada uma ganha o
// seu fetch simulado. O .NET responde 204 por padrao, para os testes de login e cadastro (que so
// usam o Java) nao precisarem saber dele. O "aoNaoAutorizado" e o mesmo dos dois clientes, como no app.
function criar(
  fetchJava: jest.Mock,
  fetchDotnet: jest.Mock = jest.fn().mockResolvedValue(resposta(204)),
  aoNaoAutorizado?: () => void,
) {
  const clienteJava = criarClienteHttp({
    baseUrl: 'http://java.teste',
    fetchImpl: fetchJava as unknown as typeof fetch,
    aoNaoAutorizado,
  });
  const clienteDotnet = criarClienteHttp({
    baseUrl: 'http://dotnet.teste',
    fetchImpl: fetchDotnet as unknown as typeof fetch,
    aoNaoAutorizado,
  });
  return criarAuthApiReal(clienteJava, clienteDotnet);
}

const dadosCadastro: DadosCadastro = {
  nome: 'Maria',
  email: 'maria@exemplo.com',
  telefone: '11999998888',
  senha: 'senha-segura-1',
  role: 'CIDADAO',
  consentimento: true,
};

describe('criarAuthApiReal', () => {
  it('login faz POST em /api/v1/auth/login e converte a resposta do Java na sessao do app', async () => {
    // Formato real do Java (conferido na API rodando): accessToken e usuario.papel.
    const respostaDoJava = {
      accessToken: 'jwt-de-teste',
      tokenType: 'Bearer',
      expiraEm: '2026-11-11T20:00:00Z',
      usuario: { id: 42, nome: 'Maria', email: 'maria@exemplo.com', papel: 'CIDADAO' },
    };
    const sessao: Sessao = {
      token: 'jwt-de-teste',
      expiraEm: '2026-11-11T20:00:00Z',
      usuario: { id: 42, nome: 'Maria', role: 'CIDADAO' },
    };
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(200, respostaDoJava));

    const resultado = await criar(fetchSimulado).login('maria@exemplo.com', 'senha-segura-1');

    expect(resultado).toEqual(sessao);
    const [url, init] = fetchSimulado.mock.calls[0];
    expect(url).toBe('http://java.teste/api/v1/auth/login');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ email: 'maria@exemplo.com', senha: 'senha-segura-1' });
  });

  it('login com senha errada lanca ErroApi 401', async () => {
    const fetchSimulado = jest
      .fn()
      .mockResolvedValue(resposta(401, { mensagem: 'E-mail ou senha incorretos.' }));

    const erro = await criar(fetchSimulado)
      .login('maria@exemplo.com', 'errada')
      .catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroApi);
    expect(erro).toMatchObject({ status: 401, message: 'E-mail ou senha incorretos.' });
  });

  it('cadastrar faz POST em /api/v1/auth/cadastro com "papel" (sem telefone) e devolve o usuario', async () => {
    const criadoNoJava = { id: 7, nome: 'Maria', email: 'maria@exemplo.com', papel: 'CIDADAO' };
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(201, criadoNoJava));

    const resultado = await criar(fetchSimulado).cadastrar(dadosCadastro);

    expect(resultado).toEqual({ id: 7, nome: 'Maria', role: 'CIDADAO' });
    const [url, init] = fetchSimulado.mock.calls[0];
    expect(url).toBe('http://java.teste/api/v1/auth/cadastro');
    expect(init.method).toBe('POST');
    // O Java nao guarda o telefone do usuario, entao ele nem sai do celular. O consentimento vai,
    // para o Java gravar o aceite (pedido ao Pedro).
    expect(JSON.parse(init.body)).toEqual({
      nome: 'Maria',
      email: 'maria@exemplo.com',
      senha: 'senha-segura-1',
      papel: 'CIDADAO',
      consentimento: true,
    });
  });

  it('cadastrar com e-mail repetido lanca ErroApi 409', async () => {
    const fetchSimulado = jest
      .fn()
      .mockResolvedValue(resposta(409, { mensagem: 'Este e-mail já está cadastrado.' }));

    const erro = await criar(fetchSimulado)
      .cadastrar(dadosCadastro)
      .catch((e: unknown) => e);

    expect(erro).toMatchObject({ status: 409, message: 'Este e-mail já está cadastrado.' });
  });

  describe('excluirConta (duas APIs: .NET primeiro, Java depois)', () => {
    it('apaga primeiro no .NET (DELETE /api/usuarios/eu) e depois no Java (DELETE /api/v1/auth/eu), os dois com o token', async () => {
      const fetchJava = jest.fn().mockResolvedValue(resposta(204));
      const fetchDotnet = jest.fn().mockResolvedValue(resposta(204));

      await criar(fetchJava, fetchDotnet).excluirConta('jwt-de-teste');

      const [urlDotnet, initDotnet] = fetchDotnet.mock.calls[0];
      expect(urlDotnet).toBe('http://dotnet.teste/api/usuarios/eu');
      expect(initDotnet.method).toBe('DELETE');
      expect(initDotnet.headers.Authorization).toBe('Bearer jwt-de-teste');
      const [urlJava, initJava] = fetchJava.mock.calls[0];
      expect(urlJava).toBe('http://java.teste/api/v1/auth/eu');
      expect(initJava.method).toBe('DELETE');
      expect(initJava.headers.Authorization).toBe('Bearer jwt-de-teste');
      // A ordem importa: o .NET (reportes, fotos) vai antes do Java (a conta).
      expect(fetchDotnet.mock.invocationCallOrder[0]).toBeLessThan(
        fetchJava.mock.invocationCallOrder[0],
      );
    });

    it('um 401 do .NET significa "ja excluida la": segue para o Java e NAO desloga o app', async () => {
      // Depois de excluida, QUALQUER token da conta da 401 no .NET (provado na API real). Sem este
      // tratamento, repetir a exclusao (apos o Java falhar uma vez) deslogaria a pessoa no meio.
      const fetchJava = jest.fn().mockResolvedValue(resposta(204));
      const fetchDotnet = jest.fn().mockResolvedValue(resposta(401, { title: 'Unauthorized' }));
      const aoNaoAutorizado = jest.fn();

      await criar(fetchJava, fetchDotnet, aoNaoAutorizado).excluirConta('jwt-de-teste');

      expect(fetchJava).toHaveBeenCalledTimes(1);
      expect(aoNaoAutorizado).not.toHaveBeenCalled();
    });

    it('se o .NET falha (ex.: 500), para: nao chama o Java e a conta continua inteira', async () => {
      const fetchJava = jest.fn().mockResolvedValue(resposta(204));
      const fetchDotnet = jest.fn().mockResolvedValue(resposta(500, { title: 'Erro' }));

      const erro = await criar(fetchJava, fetchDotnet)
        .excluirConta('jwt-de-teste')
        .catch((e: unknown) => e);

      expect(fetchJava).not.toHaveBeenCalled();
      expect(erro).toBeInstanceOf(ErroApi);
      expect(erro).not.toBeInstanceOf(ErroExclusaoParcial);
      expect((erro as ErroApi).status).toBe(500);
    });

    it('se o .NET esta fora do ar (sem conexao), para e nao chama o Java', async () => {
      const fetchJava = jest.fn().mockResolvedValue(resposta(204));
      const fetchDotnet = jest.fn().mockRejectedValue(new TypeError('Network request failed'));

      const erro = await criar(fetchJava, fetchDotnet)
        .excluirConta('jwt-de-teste')
        .catch((e: unknown) => e);

      expect(fetchJava).not.toHaveBeenCalled();
      expect((erro as ErroApi).status).toBe(0);
      expect(erro).not.toBeInstanceOf(ErroExclusaoParcial);
    });

    it('se o .NET apagou (204) e o Java falha, lanca ErroExclusaoParcial com o status do Java', async () => {
      const fetchJava = jest.fn().mockResolvedValue(resposta(500, { title: 'Erro' }));
      const fetchDotnet = jest.fn().mockResolvedValue(resposta(204));

      const erro = await criar(fetchJava, fetchDotnet)
        .excluirConta('jwt-de-teste')
        .catch((e: unknown) => e);

      expect(erro).toBeInstanceOf(ErroExclusaoParcial);
      expect(erro).toBeInstanceOf(ErroApi);
      expect((erro as ErroApi).status).toBe(500);
    });

    it('se o .NET apagou (204) e o Java esta sem conexao, tambem e exclusao parcial (status 0)', async () => {
      const fetchJava = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
      const fetchDotnet = jest.fn().mockResolvedValue(resposta(204));

      const erro = await criar(fetchJava, fetchDotnet)
        .excluirConta('jwt-de-teste')
        .catch((e: unknown) => e);

      expect(erro).toBeInstanceOf(ErroExclusaoParcial);
      expect((erro as ErroApi).status).toBe(0);
    });

    it('se o .NET deu 401 (nao se sabe se apagou) e o Java falha, o erro NAO e marcado como parcial', async () => {
      const fetchJava = jest.fn().mockResolvedValue(resposta(500, { title: 'Erro' }));
      const fetchDotnet = jest.fn().mockResolvedValue(resposta(401, { title: 'Unauthorized' }));

      const erro = await criar(fetchJava, fetchDotnet)
        .excluirConta('jwt-de-teste')
        .catch((e: unknown) => e);

      expect(erro).toBeInstanceOf(ErroApi);
      expect(erro).not.toBeInstanceOf(ErroExclusaoParcial);
      expect((erro as ErroApi).status).toBe(500);
    });

    it('com token invalido nos dois (vencido de verdade), lanca ErroApi 401 do Java', async () => {
      const fetchJava = jest
        .fn()
        .mockResolvedValue(resposta(401, { mensagem: 'Sessão inválida. Entre novamente.' }));
      const fetchDotnet = jest.fn().mockResolvedValue(resposta(401, { title: 'Unauthorized' }));
      const aoNaoAutorizado = jest.fn();

      const erro = await criar(fetchJava, fetchDotnet, aoNaoAutorizado)
        .excluirConta('velho')
        .catch((e: unknown) => e);

      expect((erro as ErroApi).status).toBe(401);
      expect(erro).not.toBeInstanceOf(ErroExclusaoParcial);
      // Quem avisa o app e o 401 do Java (esse sim e "sessao vencida"), uma vez so.
      expect(aoNaoAutorizado).toHaveBeenCalledTimes(1);
    });
  });
});
