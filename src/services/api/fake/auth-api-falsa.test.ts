import { ErroApi } from '../erro';
import type { DadosCadastro } from '../types';
import { criarAuthApiFalsa } from './auth-api-falsa';

const cadastroValido: DadosCadastro = {
  nome: 'Maria Silva',
  email: 'maria@exemplo.com',
  telefone: '(11) 98765-4321',
  senha: 'senha1234',
  role: 'CIDADAO',
  consentimento: true,
};

async function esperarErro(promessa: Promise<unknown>): Promise<ErroApi> {
  try {
    await promessa;
  } catch (erro) {
    if (erro instanceof ErroApi) return erro;
    throw erro;
  }
  throw new Error('Era esperado um erro, mas a chamada funcionou.');
}

describe('API de autenticacao falsa', () => {
  describe('cadastrar', () => {
    it('cria o usuario e devolve nome, papel e um id', async () => {
      const api = criarAuthApiFalsa();
      const usuario = await api.cadastrar(cadastroValido);
      expect(usuario).toEqual({ id: expect.any(Number), nome: 'Maria Silva', role: 'CIDADAO' });
    });

    it('da ids diferentes para usuarios diferentes', async () => {
      const api = criarAuthApiFalsa();
      const a = await api.cadastrar(cadastroValido);
      const b = await api.cadastrar({ ...cadastroValido, email: 'joao@exemplo.com' });
      expect(a.id).not.toBe(b.id);
    });

    it('recusa e-mail repetido com erro 409', async () => {
      const api = criarAuthApiFalsa();
      await api.cadastrar(cadastroValido);
      const erro = await esperarErro(api.cadastrar(cadastroValido));
      expect(erro.status).toBe(409);
      expect(erro.message).toBe('Este e-mail já está cadastrado.');
    });

    it('trata e-mail repetido sem diferenciar maiusculas e espacos', async () => {
      const api = criarAuthApiFalsa();
      await api.cadastrar(cadastroValido);
      const erro = await esperarErro(
        api.cadastrar({ ...cadastroValido, email: '  MARIA@exemplo.com ' }),
      );
      expect(erro.status).toBe(409);
    });

    it('recusa cadastro sem consentimento com erro 400', async () => {
      const api = criarAuthApiFalsa();
      const erro = await esperarErro(api.cadastrar({ ...cadastroValido, consentimento: false }));
      expect(erro.status).toBe(400);
      expect(erro.campos.consentimento).toBeDefined();
    });
  });

  describe('login', () => {
    it('devolve token, vencimento no futuro e o usuario', async () => {
      const api = criarAuthApiFalsa();
      const usuario = await api.cadastrar(cadastroValido);
      const sessao = await api.login('maria@exemplo.com', 'senha1234');
      expect(sessao.usuario).toEqual(usuario);
      expect(sessao.token.length).toBeGreaterThan(10);
      expect(new Date(sessao.expiraEm).getTime()).toBeGreaterThan(Date.now());
    });

    it('aceita o e-mail com maiusculas e espacos', async () => {
      const api = criarAuthApiFalsa();
      await api.cadastrar(cadastroValido);
      const sessao = await api.login('  Maria@Exemplo.com ', 'senha1234');
      expect(sessao.usuario.nome).toBe('Maria Silva');
    });

    it('recusa senha errada com erro 401', async () => {
      const api = criarAuthApiFalsa();
      await api.cadastrar(cadastroValido);
      const erro = await esperarErro(api.login('maria@exemplo.com', 'errada123'));
      expect(erro.status).toBe(401);
      expect(erro.message).toBe('E-mail ou senha incorretos.');
    });

    it('da a mesma mensagem para e-mail que nao existe (nao revela quem tem conta)', async () => {
      const api = criarAuthApiFalsa();
      const erro = await esperarErro(api.login('ninguem@exemplo.com', 'senha1234'));
      expect(erro.status).toBe(401);
      expect(erro.message).toBe('E-mail ou senha incorretos.');
    });
  });

  describe('excluirConta', () => {
    it('apaga a conta: depois disso o login nao funciona mais', async () => {
      const api = criarAuthApiFalsa();
      await api.cadastrar(cadastroValido);
      const sessao = await api.login('maria@exemplo.com', 'senha1234');
      await api.excluirConta(sessao.token);
      const erro = await esperarErro(api.login('maria@exemplo.com', 'senha1234'));
      expect(erro.status).toBe(401);
    });

    it('recusa token invalido com erro 401', async () => {
      const api = criarAuthApiFalsa();
      const erro = await esperarErro(api.excluirConta('token-que-nao-existe'));
      expect(erro.status).toBe(401);
    });

    it('um token deixa de valer depois que a conta e excluida', async () => {
      const api = criarAuthApiFalsa();
      await api.cadastrar(cadastroValido);
      const sessao = await api.login('maria@exemplo.com', 'senha1234');
      await api.excluirConta(sessao.token);
      const erro = await esperarErro(api.excluirConta(sessao.token));
      expect(erro.status).toBe(401);
    });
  });
});
