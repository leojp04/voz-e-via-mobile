import { ErroApi } from '../erro';
import type { DadosContato } from '../types';
import { criarAuthApiFalsa } from './auth-api-falsa';
import { criarContatosApiFalsa } from './contatos-api-falsa';

const filha: DadosContato = {
  nome: 'Marina Souza',
  apelido: 'filha',
  telefone: '(11) 98888-7777',
  prioridade: 1,
};

// Monta a API falsa de contatos com duas contas de teste (Ana e Bia). "usar" escolhe quem esta
// logada (null = sem sessao).
async function montar() {
  const auth = criarAuthApiFalsa();
  const tokens = new Map<string, string>();
  let tokenAtual: string | null = null;

  for (const nome of ['Ana', 'Bia']) {
    const email = `${nome.toLowerCase()}@exemplo.com`;
    await auth.cadastrar({
      nome,
      email,
      telefone: '11999999999',
      senha: 'Senha@123',
      role: 'CIDADAO',
      consentimento: true,
    });
    tokens.set(nome, (await auth.login(email, 'Senha@123')).token);
  }

  const aoNaoAutorizado = jest.fn();
  const api = criarContatosApiFalsa({
    obterToken: () => tokenAtual,
    idDoToken: auth.idDoToken,
    aoNaoAutorizado,
  });

  return {
    api,
    aoNaoAutorizado,
    usar: (nome: string | null) => {
      tokenAtual = nome === null ? null : (tokens.get(nome) ?? null);
    },
  };
}

async function erroDe(promessa: Promise<unknown>): Promise<ErroApi> {
  const erro = await promessa.then(
    () => null,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(ErroApi);
  return erro as ErroApi;
}

describe('criarContatosApiFalsa', () => {
  describe('criar', () => {
    it('cria o contato, guarda so os digitos do telefone e devolve um id', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const contato = await api.criar(filha);
      expect(contato).toEqual({
        id: 1,
        nome: 'Marina Souza',
        apelido: 'filha',
        telefone: '11988887777',
        prioridade: 1,
      });
    });

    it('tira os espacos das pontas do nome e do apelido', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const contato = await api.criar({ ...filha, nome: '  Marina  ', apelido: ' filha ' });
      expect(contato.nome).toBe('Marina');
      expect(contato.apelido).toBe('filha');
    });

    it('recusa dados invalidos com a mensagem de cada campo (400)', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const erro = await erroDe(
        api.criar({ nome: 'A', apelido: '', telefone: '123', prioridade: 9 }),
      );
      expect(erro.status).toBe(400);
      expect(Object.keys(erro.campos).sort()).toEqual([
        'apelido',
        'nome',
        'prioridade',
        'telefone',
      ]);
    });

    it('aceita telefone fixo (10 digitos) e celular (11 digitos)', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      await expect(api.criar({ ...filha, telefone: '1133334444' })).resolves.toBeDefined();
      await expect(api.criar({ ...filha, telefone: '11933334444' })).resolves.toBeDefined();
    });

    it('recusa telefone com 12 digitos', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const erro = await erroDe(api.criar({ ...filha, telefone: '119333344445' }));
      expect(erro.campos.telefone).toBeDefined();
    });
  });

  describe('listar', () => {
    it('lista so os contatos de quem esta logado, por prioridade e depois por nome', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      await api.criar({ ...filha, nome: 'Zeca', apelido: 'vizinho', prioridade: 2 });
      await api.criar({ ...filha, nome: 'Marina', apelido: 'filha', prioridade: 1 });
      await api.criar({ ...filha, nome: 'Beto', apelido: 'filho', prioridade: 2 });
      usar('Bia');
      await api.criar({ ...filha, nome: 'Outra Pessoa', apelido: 'amiga' });

      usar('Ana');
      const pagina = await api.listar(1, 10);
      expect(pagina.itens.map((c) => c.nome)).toEqual(['Marina', 'Beto', 'Zeca']);
      expect(pagina).toMatchObject({ pagina: 1, tamanho: 10, total: 3 });
    });

    it('pagina o resultado a partir da pagina 1', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      for (let i = 1; i <= 5; i++) {
        await api.criar({ ...filha, nome: `Contato ${i}`, apelido: `c${i}`, prioridade: 1 });
      }
      const segunda = await api.listar(2, 2);
      expect(segunda.itens.map((c) => c.nome)).toEqual(['Contato 3', 'Contato 4']);
      expect(segunda.total).toBe(5);
    });

    it('devolve lista vazia quando nao ha contatos', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      expect(await api.listar(1, 10)).toEqual({ itens: [], pagina: 1, tamanho: 10, total: 0 });
    });

    it('recusa pagina ou tamanho invalido (400)', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      expect((await erroDe(api.listar(0, 10))).status).toBe(400);
      expect((await erroDe(api.listar(1, 0))).status).toBe(400);
      expect((await erroDe(api.listar(1, 51))).status).toBe(400);
    });
  });

  describe('obter, editar e excluir', () => {
    it('edita um contato e o devolve atualizado', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const criado = await api.criar(filha);
      const editado = await api.editar(criado.id, {
        ...filha,
        apelido: 'filhota',
        prioridade: 3,
      });
      expect(editado).toMatchObject({ id: criado.id, apelido: 'filhota', prioridade: 3 });
      expect((await api.obter(criado.id)).apelido).toBe('filhota');
    });

    it('valida os dados na edicao (400)', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const criado = await api.criar(filha);
      const erro = await erroDe(api.editar(criado.id, { ...filha, telefone: '1' }));
      expect(erro.status).toBe(400);
      expect(erro.campos.telefone).toBeDefined();
    });

    it('exclui o contato', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const criado = await api.criar(filha);
      await api.excluir(criado.id);
      expect((await api.listar(1, 10)).total).toBe(0);
      expect((await erroDe(api.obter(criado.id))).status).toBe(404);
    });

    it('responde 404 para contato que nao existe ou e de outra pessoa', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const criado = await api.criar(filha);
      usar('Bia');
      expect((await erroDe(api.obter(criado.id))).status).toBe(404);
      expect((await erroDe(api.editar(criado.id, filha))).status).toBe(404);
      expect((await erroDe(api.excluir(criado.id))).status).toBe(404);
      expect((await erroDe(api.obter(999))).status).toBe(404);
    });
  });

  describe('sessao', () => {
    it('responde 401 sem sessao, sem avisar "sessao vencida"', async () => {
      const { api, usar, aoNaoAutorizado } = await montar();
      usar(null);
      expect((await erroDe(api.listar(1, 10))).status).toBe(401);
      expect(aoNaoAutorizado).not.toHaveBeenCalled();
    });
  });

  it('nao deixa quem recebeu um contato alterar o que esta guardado', async () => {
    const { api, usar } = await montar();
    usar('Ana');
    const criado = await api.criar(filha);
    criado.nome = 'Alterado por fora';
    expect((await api.obter(criado.id)).nome).toBe('Marina Souza');
  });
});
