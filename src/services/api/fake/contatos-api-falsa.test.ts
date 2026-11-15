import { ErroApi } from '../erro';
import { criarAuthApiFalsa } from './auth-api-falsa';
import { criarContatosApiFalsa } from './contatos-api-falsa';

// A API falsa imita o que o cidadao ve no Java: o perfil de emergencia ja existe (criado pelo
// cuidador) com alguns contatos. O app so consulta, entao nao ha criar, editar nem excluir.
async function montar() {
  const auth = criarAuthApiFalsa();
  await auth.cadastrar({
    nome: 'Ana',
    email: 'ana@exemplo.com',
    telefone: '11999999999',
    senha: 'Senha@123',
    role: 'CIDADAO',
    consentimento: true,
  });
  const token = (await auth.login('ana@exemplo.com', 'Senha@123')).token;

  let tokenAtual: string | null = token;
  const aoNaoAutorizado = jest.fn();
  const api = criarContatosApiFalsa({
    obterToken: () => tokenAtual,
    idDoToken: auth.idDoToken,
    aoNaoAutorizado,
  });

  return {
    api,
    aoNaoAutorizado,
    usarToken: (novo: string | null) => {
      tokenAtual = novo;
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
  describe('listar', () => {
    it('lista os contatos de exemplo por prioridade, no formato do Java (parentesco, +55)', async () => {
      const { api } = await montar();
      const pagina = await api.listar(1, 10);

      expect(pagina).toMatchObject({ pagina: 1, tamanho: 10, total: 3 });
      expect(pagina.itens.map((c) => c.prioridade)).toEqual([1, 2, 3]);
      expect(pagina.itens[0]).toEqual({
        id: 1,
        nome: 'Marina Souza',
        parentesco: 'filha',
        telefone: '+5511988887777',
        prioridade: 1,
      });
    });

    it('tem contato sem parentesco (opcional no Java)', async () => {
      const { api } = await montar();
      const { itens } = await api.listar(1, 10);
      expect(itens.some((c) => c.parentesco === null)).toBe(true);
    });

    it('pagina o resultado a partir da pagina 1', async () => {
      const { api } = await montar();
      const segunda = await api.listar(2, 2);
      expect(segunda.itens.map((c) => c.id)).toEqual([3]);
      expect(segunda).toMatchObject({ pagina: 2, tamanho: 2, total: 3 });
    });

    it('recusa pagina ou tamanho invalido (400)', async () => {
      const { api } = await montar();
      expect((await erroDe(api.listar(0, 10))).status).toBe(400);
      expect((await erroDe(api.listar(1, 0))).status).toBe(400);
      expect((await erroDe(api.listar(1, 51))).status).toBe(400);
    });
  });

  describe('obter', () => {
    it('devolve um contato pelo id', async () => {
      const { api } = await montar();
      expect((await api.obter(2)).id).toBe(2);
    });

    it('responde 404 para contato que nao existe', async () => {
      const { api } = await montar();
      expect((await erroDe(api.obter(999))).status).toBe(404);
    });

    it('nao deixa quem recebeu um contato alterar o que esta guardado', async () => {
      const { api } = await montar();
      const contato = await api.obter(1);
      contato.nome = 'Alterado por fora';
      expect((await api.obter(1)).nome).toBe('Marina Souza');
    });
  });

  describe('sessao', () => {
    it('responde 401 sem sessao, sem avisar "sessao vencida"', async () => {
      const { api, usarToken, aoNaoAutorizado } = await montar();
      usarToken(null);
      expect((await erroDe(api.listar(1, 10))).status).toBe(401);
      expect(aoNaoAutorizado).not.toHaveBeenCalled();
    });

    it('com token que nao vale, responde 401 e avisa que a sessao venceu', async () => {
      const { api, usarToken, aoNaoAutorizado } = await montar();
      usarToken('token-que-nao-existe');
      expect((await erroDe(api.obter(1))).status).toBe(401);
      expect(aoNaoAutorizado).toHaveBeenCalledTimes(1);
    });
  });
});
