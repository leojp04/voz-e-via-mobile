import { ErroApi } from '../erro';
import { criarAssistenteApiFalsa } from './assistente-api-falsa';
import { criarAuthApiFalsa } from './auth-api-falsa';

// Monta a API falsa do assistente com uma conta de teste logada (ou sem sessao).
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
  const api = criarAssistenteApiFalsa({
    obterToken: () => tokenAtual,
    idDoToken: auth.idDoToken,
    aoNaoAutorizado,
  });
  return {
    api,
    aoNaoAutorizado,
    sairDaSessao: () => {
      tokenAtual = null;
    },
    usarTokenInvalido: () => {
      tokenAtual = 'token-que-nao-vale';
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

describe('criarAssistenteApiFalsa', () => {
  it('entende um problema de calçada como REPORTAR_PROBLEMA e pede confirmação', async () => {
    const { api } = await montar();

    const r = await api.interpretar({ texto: 'a calçada aqui na frente está toda quebrada' });

    expect(r.intencao).toBe('REPORTAR_PROBLEMA');
    expect(r.parametros.categoria).toBe('CALCADA');
    expect(r.parametros.descricao).toBeTruthy();
    expect(r.precisaConfirmacao).toBe(true);
    expect(r.respostaFalada).not.toBe('');
  });

  it('entende "ligar para minha filha" e devolve o apelido', async () => {
    const { api } = await montar();

    const r = await api.interpretar({ texto: 'quero ligar para minha filha' });

    expect(r.intencao).toBe('LIGAR_CONTATO');
    expect(r.parametros.apelido).toBe('filha');
    expect(r.precisaConfirmacao).toBe(true);
  });

  it.each(['socorro', 'preciso de ajuda', 'eu caí'])(
    'entende "%s" como EMERGENCIA',
    async (texto) => {
      const { api } = await montar();

      const r = await api.interpretar({ texto });

      expect(r.intencao).toBe('EMERGENCIA');
      expect(r.precisaConfirmacao).toBe(true);
    },
  );

  it('entende "farmácia perto daqui" como LOCAL_PROXIMO', async () => {
    const { api } = await montar();

    const r = await api.interpretar({ texto: 'onde tem uma farmácia perto daqui?' });

    expect(r.intencao).toBe('LOCAL_PROXIMO');
    expect(r.parametros.busca).toBe('farmácia');
  });

  it('entende "como está minha reclamação" como CONSULTAR_REPORTES', async () => {
    const { api } = await montar();

    const r = await api.interpretar({ texto: 'como está minha reclamação?' });

    expect(r.intencao).toBe('CONSULTAR_REPORTES');
  });

  it('entende uma dúvida de direito e cita a fonte', async () => {
    const { api } = await montar();

    const r = await api.interpretar({ texto: 'tenho direito a passe livre no ônibus?' });

    expect(r.intencao).toBe('DUVIDA_DIREITO');
    expect(r.fontes.length).toBeGreaterThan(0);
    expect(r.precisaConfirmacao).toBe(false);
  });

  it('o que não entende vira NAO_ENTENDI', async () => {
    const { api } = await montar();

    const r = await api.interpretar({ texto: 'blá blá qualquer coisa' });

    expect(r.intencao).toBe('NAO_ENTENDI');
    expect(r.precisaConfirmacao).toBe(false);
  });

  it('texto vazio ou só com espaços dá 400', async () => {
    const { api } = await montar();

    expect((await erroDe(api.interpretar({ texto: '   ' }))).status).toBe(400);
  });

  it('texto longo demais dá 400', async () => {
    const { api } = await montar();

    expect((await erroDe(api.interpretar({ texto: 'a'.repeat(501) }))).status).toBe(400);
  });

  it('sem sessão dá 401 e não avisa o app (nunca houve token)', async () => {
    const { api, sairDaSessao, aoNaoAutorizado } = await montar();
    sairDaSessao();

    expect((await erroDe(api.interpretar({ texto: 'socorro' }))).status).toBe(401);
    expect(aoNaoAutorizado).not.toHaveBeenCalled();
  });

  it('token que não vale dá 401 e avisa o app (sessão vencida)', async () => {
    const { api, usarTokenInvalido, aoNaoAutorizado } = await montar();
    usarTokenInvalido();

    expect((await erroDe(api.interpretar({ texto: 'socorro' }))).status).toBe(401);
    expect(aoNaoAutorizado).toHaveBeenCalledTimes(1);
  });
});
