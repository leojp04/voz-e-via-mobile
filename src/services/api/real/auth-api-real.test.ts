import { criarClienteHttp } from '../cliente-http';
import { ErroApi } from '../erro';
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

function criar(fetchSimulado: jest.Mock) {
  const cliente = criarClienteHttp({
    baseUrl: 'http://java.teste',
    fetchImpl: fetchSimulado as unknown as typeof fetch,
  });
  return criarAuthApiReal(cliente);
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

  it('excluirConta faz DELETE em /api/v1/auth/eu com o token recebido', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(204));

    await criar(fetchSimulado).excluirConta('jwt-de-teste');

    const [url, init] = fetchSimulado.mock.calls[0];
    expect(url).toBe('http://java.teste/api/v1/auth/eu');
    expect(init.method).toBe('DELETE');
    expect(init.headers.Authorization).toBe('Bearer jwt-de-teste');
  });

  it('excluirConta com token invalido lanca ErroApi 401', async () => {
    const fetchSimulado = jest
      .fn()
      .mockResolvedValue(resposta(401, { mensagem: 'Sessão inválida. Entre novamente.' }));

    const erro = await criar(fetchSimulado)
      .excluirConta('velho')
      .catch((e: unknown) => e);

    expect((erro as ErroApi).status).toBe(401);
  });
});
