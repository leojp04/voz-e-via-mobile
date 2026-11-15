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

describe('criarAssistenteApiFalsa.interpretar', () => {
  it('entende um problema de calçada como ZELADORIA_REPORT', async () => {
    const { api } = await montar();

    const r = await api.interpretar({ texto: 'a calçada aqui na frente está toda quebrada' });

    expect(r.intencao).toBe('ZELADORIA_REPORT');
    expect(r.entidades.problemaRua).toBe('CALCADA_DANIFICADA');
    expect(r.mensagemFalada).not.toBe('');
    expect(r.atendimentos).toBeNull();
  });

  it('marca impedeCadeirante quando a fala cita cadeira de rodas', async () => {
    const { api } = await montar();

    const r = await api.interpretar({ texto: 'tem um buraco e não passo com a cadeira de rodas' });

    expect(r.intencao).toBe('ZELADORIA_REPORT');
    expect(r.entidades.problemaRua).toBe('BURACO');
    expect(r.entidades.impedeCadeirante).toBe(true);
  });

  it('"calçada quebrada, quase caí" é um reporte, não um pedido de socorro', async () => {
    const { api } = await montar();

    const r = await api.interpretar({ texto: 'a calçada está quebrada, quase caí' });

    expect(r.intencao).toBe('ZELADORIA_REPORT');
  });

  it.each(['socorro', 'preciso de ajuda', 'eu caí'])(
    'entende "%s" como SOCORRO com urgência crítica',
    async (texto) => {
      const { api } = await montar();

      const r = await api.interpretar({ texto });

      expect(r.intencao).toBe('SOCORRO');
      expect(r.urgencia).toBe('CRITICA');
    },
  );

  it('"farmácia perto daqui" é BUSCAR_ATENDIMENTO e traz locais quando há localização', async () => {
    const { api } = await montar();

    const r = await api.interpretar({
      texto: 'onde tem uma farmácia perto daqui?',
      latitude: -23.5,
      longitude: -46.6,
    });

    expect(r.intencao).toBe('BUSCAR_ATENDIMENTO');
    expect(r.entidades.tipoAtendimento).toBe('FARMACIA');
    expect(r.atendimentos?.tipo).toBe('FARMACIA');
    expect(r.atendimentos?.atendimentos.length).toBeGreaterThan(0);
    expect(r.atendimentos?.creditoDados).toContain('OpenStreetMap');
  });

  it('busca de atendimento sem localização não traz a lista', async () => {
    const { api } = await montar();

    const r = await api.interpretar({ texto: 'hospital mais perto, uso cadeira de rodas' });

    expect(r.intencao).toBe('BUSCAR_ATENDIMENTO');
    expect(r.entidades.exigeAcessibilidade).toBe(true);
    expect(r.atendimentos).toBeNull();
  });

  it('hospital e UPA trazem a orientação de ligar 192', async () => {
    const { api } = await montar();

    const r = await api.interpretar({
      texto: 'hospital perto de mim',
      latitude: -23.5,
      longitude: -46.6,
    });

    expect(r.atendimentos?.telefoneEmergencia).toBe('192');
    expect(r.atendimentos?.orientacaoEmergencia).toContain('192');
  });

  it('"isso é golpe?" é VERIFICAR_INFORMACAO', async () => {
    const { api } = await montar();

    const r = await api.interpretar({ texto: 'recebi uma mensagem do INSS, isso é golpe?' });

    expect(r.intencao).toBe('VERIFICAR_INFORMACAO');
  });

  it('o que não entende vira DESCONHECIDA', async () => {
    const { api } = await montar();

    const r = await api.interpretar({ texto: 'blá blá qualquer coisa' });

    expect(r.intencao).toBe('DESCONHECIDA');
    expect(r.atendimentos).toBeNull();
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

describe('criarAssistenteApiFalsa.acionarEmergencia', () => {
  it('registra o pedido e devolve um id, sem fingir que avisou contatos', async () => {
    const { api } = await montar();

    const r = await api.acionarEmergencia({ textoOriginal: 'caí e não consigo levantar' });

    expect(r.id).toBeGreaterThan(0);
    expect(r.contatosNotificados).toBe(0);
    expect(r.mensagemFalada).toContain('192');
  });

  it('frase com mais de 300 letras dá 400', async () => {
    const { api } = await montar();

    const erro = await erroDe(api.acionarEmergencia({ textoOriginal: 'a'.repeat(301) }));

    expect(erro.status).toBe(400);
  });

  it('sem sessão dá 401', async () => {
    const { api, sairDaSessao } = await montar();
    sairDaSessao();

    expect((await erroDe(api.acionarEmergencia({}))).status).toBe(401);
  });
});

describe('criarAssistenteApiFalsa.verificarMensagem', () => {
  it('mensagem com link e pressa é PROVAVEL_GOLPE, com sinais e orientação', async () => {
    const { api } = await montar();

    const r = await api.verificarMensagem({
      texto: 'INSS: seu benefício será bloqueado hoje. Clique em http://inss-atualiza.com',
    });

    expect(r.classificacao).toBe('PROVAVEL_GOLPE');
    expect(r.sinais.length).toBeGreaterThan(0);
    expect(r.orientacao).not.toBe('');
    expect(r.mensagemFalada).not.toBe('');
  });

  it('sem sinais claros, nunca afirma que é seguro', async () => {
    const { api } = await montar();

    const r = await api.verificarMensagem({ texto: 'Oi, tudo bem? Almoço domingo?' });

    expect(r.classificacao).toBe('NAO_E_POSSIVEL_AVALIAR');
  });

  it('texto vazio ou com mais de 2000 letras dá 400', async () => {
    const { api } = await montar();

    expect((await erroDe(api.verificarMensagem({ texto: '  ' }))).status).toBe(400);
    expect((await erroDe(api.verificarMensagem({ texto: 'a'.repeat(2001) }))).status).toBe(400);
  });

  it('sem sessão dá 401', async () => {
    const { api, sairDaSessao } = await montar();
    sairDaSessao();

    expect((await erroDe(api.verificarMensagem({ texto: 'oi' }))).status).toBe(401);
  });
});
