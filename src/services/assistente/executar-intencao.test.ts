import { ErroApi } from '../api/erro';
import type { Contato, ContatosApi, RespostaAssistente } from '../api/types';
import { executarIntencao, intencaoTemAcao, type Dependencias } from './executar-intencao';

function contato(id: number, apelido: string, telefone = '11988887777'): Contato {
  return { id, nome: `Nome ${id}`, apelido, telefone, prioridade: 1 };
}

function resposta(parcial: Partial<RespostaAssistente> = {}): RespostaAssistente {
  return {
    intencao: 'NAO_ENTENDI',
    parametros: {},
    respostaFalada: 'ok',
    fontes: [],
    precisaConfirmacao: false,
    ...parcial,
  };
}

function montar(contatos: Contato[] = []) {
  const listar = jest.fn<ReturnType<ContatosApi['listar']>, Parameters<ContatosApi['listar']>>(
    async (pagina, tamanho) => ({
      itens: contatos.slice((pagina - 1) * tamanho, pagina * tamanho),
      pagina,
      tamanho,
      total: contatos.length,
    }),
  );
  const deps = {
    contatos: { listar } as unknown as ContatosApi,
    ligarPara: jest.fn(),
    abrirBuscaNoMapa: jest.fn(),
    obterLocalizacao: jest.fn().mockResolvedValue({ latitude: -23.5, longitude: -46.6 }),
    navegar: jest.fn(),
  } satisfies Dependencias;
  return { deps, listar };
}

describe('intencaoTemAcao', () => {
  it('so DUVIDA_DIREITO e NAO_ENTENDI nao tem acao (so mostram a resposta)', () => {
    expect(intencaoTemAcao('DUVIDA_DIREITO')).toBe(false);
    expect(intencaoTemAcao('NAO_ENTENDI')).toBe(false);
    for (const i of [
      'LIGAR_CONTATO',
      'LOCAL_PROXIMO',
      'REPORTAR_PROBLEMA',
      'CONSULTAR_REPORTES',
      'EMERGENCIA',
    ] as const) {
      expect(intencaoTemAcao(i)).toBe(true);
    }
  });
});

describe('executarIntencao - LIGAR_CONTATO', () => {
  const pedido = (apelido?: string) =>
    resposta({ intencao: 'LIGAR_CONTATO', parametros: apelido ? { apelido } : {} });

  it('acha o contato pelo apelido (sem diferenciar maiuscula nem acento) e abre o discador', async () => {
    const { deps } = montar([contato(1, 'Mãe', '11911112222'), contato(2, 'Filha', '11933334444')]);
    const resultado = await executarIntencao(pedido('FILHA'), deps);
    expect(deps.ligarPara).toHaveBeenCalledWith('11933334444');
    expect(resultado).toEqual({ tipo: 'feito' });
  });

  it('acha "mae" para o apelido "Mãe"', async () => {
    const { deps } = montar([contato(1, 'Mãe', '11911112222')]);
    await executarIntencao(pedido('mae'), deps);
    expect(deps.ligarPara).toHaveBeenCalledWith('11911112222');
  });

  it('procura nas varias paginas de contatos', async () => {
    const muitos = Array.from({ length: 120 }, (_, i) => contato(i + 1, `apelido${i + 1}`));
    const { deps, listar } = montar(muitos);
    await executarIntencao(pedido('apelido115'), deps);
    expect(listar.mock.calls.length).toBeGreaterThan(1);
    expect(deps.ligarPara).toHaveBeenCalledWith('11988887777');
  });

  it('apelido que nao existe: avisa e nao liga', async () => {
    const { deps } = montar([contato(1, 'Filha')]);
    const resultado = await executarIntencao(pedido('vizinho'), deps);
    expect(deps.ligarPara).not.toHaveBeenCalled();
    expect(resultado).toEqual({
      tipo: 'aviso',
      mensagem: 'Não encontrei "vizinho" nos seus contatos. Abra Contatos para conferir o apelido.',
    });
  });

  it('dois contatos com o mesmo apelido: nao escolhe por conta propria', async () => {
    const { deps } = montar([contato(1, 'Filha'), contato(2, 'filha')]);
    const resultado = await executarIntencao(pedido('filha'), deps);
    expect(deps.ligarPara).not.toHaveBeenCalled();
    expect(resultado).toEqual({
      tipo: 'aviso',
      mensagem: 'Você tem mais de um contato chamado "filha". Abra Contatos e ligue pelo botão.',
    });
  });

  it('sem apelido na resposta: avisa', async () => {
    const { deps } = montar([contato(1, 'Filha')]);
    const resultado = await executarIntencao(pedido(), deps);
    expect(resultado.tipo).toBe('aviso');
    expect(deps.ligarPara).not.toHaveBeenCalled();
  });

  it('falha ao listar contatos (sem internet): avisa que nao ligou', async () => {
    const { deps, listar } = montar();
    listar.mockRejectedValue(new ErroApi(0, 'sem conexao'));
    const resultado = await executarIntencao(pedido('filha'), deps);
    expect(deps.ligarPara).not.toHaveBeenCalled();
    expect(resultado).toEqual({
      tipo: 'aviso',
      mensagem:
        'Não foi possível consultar seus contatos agora. Verifique a internet e tente de novo.',
    });
  });
});

describe('executarIntencao - LOCAL_PROXIMO', () => {
  const pedido = (busca?: string) =>
    resposta({ intencao: 'LOCAL_PROXIMO', parametros: busca ? { busca } : {} });

  it('abre o mapa buscando perto da localizacao atual', async () => {
    const { deps } = montar();
    const resultado = await executarIntencao(pedido('farmácia'), deps);
    expect(deps.abrirBuscaNoMapa).toHaveBeenCalledWith('farmácia', {
      latitude: -23.5,
      longitude: -46.6,
    });
    expect(resultado).toEqual({ tipo: 'feito' });
  });

  it('sem GPS (permissao negada), abre o mapa so com a busca', async () => {
    const { deps } = montar();
    deps.obterLocalizacao.mockRejectedValue(new Error('negada'));
    const resultado = await executarIntencao(pedido('farmácia'), deps);
    expect(deps.abrirBuscaNoMapa).toHaveBeenCalledWith('farmácia', undefined);
    expect(resultado).toEqual({ tipo: 'feito' });
  });

  it('sem termo de busca: avisa e nao abre o mapa', async () => {
    const { deps } = montar();
    const resultado = await executarIntencao(pedido(), deps);
    expect(resultado.tipo).toBe('aviso');
    expect(deps.abrirBuscaNoMapa).not.toHaveBeenCalled();
  });
});

describe('executarIntencao - REPORTAR_PROBLEMA', () => {
  it('abre o formulario de novo reporte ja preenchido (a pessoa ainda revisa e envia)', async () => {
    const { deps } = montar();
    const resultado = await executarIntencao(
      resposta({
        intencao: 'REPORTAR_PROBLEMA',
        parametros: { categoria: 'CALCADA', urgencia: 'ALTA', descricao: 'Calçada quebrada' },
      }),
      deps,
    );
    expect(deps.navegar).toHaveBeenCalledWith({
      pathname: '/reportes/novo',
      params: { categoria: 'CALCADA', urgencia: 'ALTA', descricao: 'Calçada quebrada' },
    });
    expect(resultado).toEqual({ tipo: 'feito' });
  });

  it('manda so os parametros que vieram', async () => {
    const { deps } = montar();
    await executarIntencao(
      resposta({ intencao: 'REPORTAR_PROBLEMA', parametros: { descricao: 'Algo' } }),
      deps,
    );
    expect(deps.navegar).toHaveBeenCalledWith({
      pathname: '/reportes/novo',
      params: { descricao: 'Algo' },
    });
  });
});

describe('executarIntencao - demais intencoes', () => {
  it('CONSULTAR_REPORTES abre a lista de reportes', async () => {
    const { deps } = montar();
    const resultado = await executarIntencao(resposta({ intencao: 'CONSULTAR_REPORTES' }), deps);
    expect(deps.navegar).toHaveBeenCalledWith({ pathname: '/reportes' });
    expect(resultado).toEqual({ tipo: 'feito' });
  });

  it('EMERGENCIA: nao finge que avisou; diz que ainda nao esta disponivel e lembra o 192', async () => {
    const { deps } = montar();
    const resultado = await executarIntencao(resposta({ intencao: 'EMERGENCIA' }), deps);
    expect(resultado).toEqual({
      tipo: 'aviso',
      mensagem:
        'O aviso aos cuidadores ainda não está disponível neste aplicativo. Em emergência, ligue para o SAMU: 192.',
    });
    expect(deps.ligarPara).not.toHaveBeenCalled();
  });

  it.each(['DUVIDA_DIREITO', 'NAO_ENTENDI'] as const)('%s nao executa nada', async (intencao) => {
    const { deps } = montar();
    const resultado = await executarIntencao(resposta({ intencao }), deps);
    expect(resultado).toEqual({ tipo: 'nada' });
    expect(deps.navegar).not.toHaveBeenCalled();
    expect(deps.ligarPara).not.toHaveBeenCalled();
    expect(deps.abrirBuscaNoMapa).not.toHaveBeenCalled();
  });
});
