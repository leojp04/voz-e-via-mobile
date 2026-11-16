import { ErroApi } from '../erro';
import { criarAuthApiFalsa } from './auth-api-falsa';
import { criarPerfisApiFalsa } from './perfis-api-falsa';

// A API falsa imita o Java: o cidadao comeca SEM perfil (meu() = null), cria o proprio (um so, 409
// na segunda vez) e edita. A mobilidade e opcional e, sem ela, fica NAO_INFORMADO.
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
  const api = criarPerfisApiFalsa({
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

const dados = {
  mobilidade: 'NAO_INFORMADO' as const,
  condicoesSaude: 'Hipertensão',
  medicamentos: null,
  observacoes: null,
};

describe('criarPerfisApiFalsa', () => {
  it('quem acabou de entrar nao tem perfil: meu() devolve null', async () => {
    const { api } = await montar();
    expect(await api.meu()).toBeNull();
  });

  it('cria o perfil e meu() passa a devolve-lo', async () => {
    const { api } = await montar();

    const criado = await api.criar(dados);

    expect(criado).toMatchObject({ condicoesSaude: 'Hipertensão', mobilidade: 'NAO_INFORMADO' });
    expect(await api.meu()).toEqual(criado);
    expect(api.temPerfil()).toBe(true);
  });

  it('so um perfil por pessoa: criar de novo responde 409', async () => {
    const { api } = await montar();
    await api.criar(dados);
    expect((await erroDe(api.criar(dados))).status).toBe(409);
  });

  it('recusa textos acima de 500 letras com 400', async () => {
    const { api } = await montar();
    expect((await erroDe(api.criar({ ...dados, observacoes: 'a'.repeat(501) }))).status).toBe(400);
    expect((await erroDe(api.criar({ ...dados, medicamentos: 'a'.repeat(501) }))).status).toBe(400);
  });

  it('atualiza o perfil', async () => {
    const { api } = await montar();
    const { id } = await api.criar(dados);

    const atualizado = await api.atualizar(id, {
      ...dados,
      mobilidade: 'CADEIRANTE',
      medicamentos: 'Losartana 50 mg',
    });

    expect(atualizado).toMatchObject({
      id,
      mobilidade: 'CADEIRANTE',
      medicamentos: 'Losartana 50 mg',
    });
    expect((await api.meu())?.mobilidade).toBe('CADEIRANTE');
  });

  it('atualizar um perfil que nao existe responde 404', async () => {
    const { api } = await montar();
    expect((await erroDe(api.atualizar(999, dados))).status).toBe(404);
  });

  it('nao deixa quem recebeu o perfil alterar o que esta guardado', async () => {
    const { api } = await montar();
    const criado = await api.criar(dados);
    criado.condicoesSaude = 'Alterado por fora';
    expect((await api.meu())?.condicoesSaude).toBe('Hipertensão');
  });

  describe('sessao', () => {
    it('responde 401 sem sessao, sem avisar "sessao vencida"', async () => {
      const { api, usarToken, aoNaoAutorizado } = await montar();
      usarToken(null);
      expect((await erroDe(api.meu())).status).toBe(401);
      expect(aoNaoAutorizado).not.toHaveBeenCalled();
    });

    it('com token que nao vale, responde 401 e avisa que a sessao venceu', async () => {
      const { api, usarToken, aoNaoAutorizado } = await montar();
      usarToken('token-que-nao-existe');
      expect((await erroDe(api.criar(dados))).status).toBe(401);
      expect(aoNaoAutorizado).toHaveBeenCalledTimes(1);
    });
  });
});
