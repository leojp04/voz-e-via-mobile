import { ErroApi } from '../api/erro';
import type {
  EntidadesDaFala,
  RespostaAssistente,
  ResultadoEmergencia,
  ResultadoVerificacao,
} from '../api/types';
import { executarIntencao, intencaoTemAcao, type Dependencias } from './executar-intencao';

const SEM_ENTIDADES: EntidadesDaFala = {
  tipoAtendimento: null,
  exigeAcessibilidade: null,
  problemaRua: null,
  impedeCadeirante: null,
  referenciaLocal: null,
};

function resposta(parcial: Partial<RespostaAssistente> = {}): RespostaAssistente {
  return {
    intencao: 'DESCONHECIDA',
    urgencia: null,
    entidades: SEM_ENTIDADES,
    mensagemFalada: 'ok',
    confianca: 0.9,
    atendimentos: null,
    orientacao: null,
    ...parcial,
  };
}

const EMERGENCIA: ResultadoEmergencia = {
  id: 7,
  contatosNotificados: 2,
  mensagemFalada: 'Avisei 2 contatos.',
};

const VERIFICACAO: ResultadoVerificacao = {
  classificacao: 'PROVAVEL_GOLPE',
  tipoGolpe: 'FALSO_PARENTE',
  sinais: ['Pede dinheiro com urgência'],
  orientacao: 'Não faça o Pix. Ligue para a pessoa.',
  canalOficial: null,
  mensagemFalada: 'Isso parece golpe.',
  fontes: [],
};

function montar() {
  const deps = {
    assistente: {
      acionarEmergencia: jest.fn().mockResolvedValue(EMERGENCIA),
      verificarMensagem: jest.fn().mockResolvedValue(VERIFICACAO),
    },
    obterLocalizacao: jest.fn().mockResolvedValue({ latitude: -23.5, longitude: -46.6 }),
    navegar: jest.fn(),
  } satisfies Dependencias;
  return deps;
}

describe('intencaoTemAcao', () => {
  it('SOCORRO, VERIFICAR_INFORMACAO e ZELADORIA_REPORT pedem botao de acao', () => {
    expect(intencaoTemAcao('SOCORRO')).toBe(true);
    expect(intencaoTemAcao('VERIFICAR_INFORMACAO')).toBe(true);
    expect(intencaoTemAcao('ZELADORIA_REPORT')).toBe(true);
  });

  it('BUSCAR_ATENDIMENTO e DESCONHECIDA so mostram a resposta (a lista ja veio do Java)', () => {
    expect(intencaoTemAcao('BUSCAR_ATENDIMENTO')).toBe(false);
    expect(intencaoTemAcao('DESCONHECIDA')).toBe(false);
  });
});

describe('executarIntencao - SOCORRO', () => {
  const pedido = resposta({ intencao: 'SOCORRO', urgencia: 'CRITICA' });

  it('aciona a emergencia com a localizacao e a frase dita, e oferece ligar para o 192', async () => {
    const deps = montar();
    const resultado = await executarIntencao(pedido, 'socorro, caí e não consigo levantar', deps);
    expect(deps.assistente.acionarEmergencia).toHaveBeenCalledWith({
      latitude: -23.5,
      longitude: -46.6,
      textoOriginal: 'socorro, caí e não consigo levantar',
    });
    expect(resultado).toEqual({
      tipo: 'emergencia',
      resultado: EMERGENCIA,
      telefoneEmergencia: '192',
    });
  });

  it('sem GPS ainda aciona a emergencia, so que sem coordenadas', async () => {
    const deps = montar();
    deps.obterLocalizacao.mockRejectedValue(new Error('permissao negada'));
    await executarIntencao(pedido, 'socorro', deps);
    expect(deps.assistente.acionarEmergencia).toHaveBeenCalledWith({ textoOriginal: 'socorro' });
  });

  it('corta a frase dita em 300 letras, o limite da API', async () => {
    const deps = montar();
    await executarIntencao(pedido, 'a'.repeat(500), deps);
    const enviado = deps.assistente.acionarEmergencia.mock.calls[0][0];
    expect(enviado.textoOriginal).toHaveLength(300);
  });

  it('se a API falhar, avisa e manda ligar para o SAMU: nunca finge que avisou alguem', async () => {
    const deps = montar();
    deps.assistente.acionarEmergencia.mockRejectedValue(new ErroApi(0, 'sem conexao'));
    const resultado = await executarIntencao(pedido, 'socorro', deps);
    expect(resultado.tipo).toBe('aviso');
    expect(resultado.tipo === 'aviso' && resultado.mensagem).toContain('192');
  });
});

describe('executarIntencao - VERIFICAR_INFORMACAO', () => {
  const pedido = resposta({ intencao: 'VERIFICAR_INFORMACAO' });

  it('manda a mensagem para verificacao e devolve o parecer', async () => {
    const deps = montar();
    const resultado = await executarIntencao(
      pedido,
      '  mãe, troquei de número, faz um pix  ',
      deps,
    );
    expect(deps.assistente.verificarMensagem).toHaveBeenCalledWith({
      texto: 'mãe, troquei de número, faz um pix',
    });
    expect(resultado).toEqual({ tipo: 'verificacao', resultado: VERIFICACAO });
  });

  it('sem texto nao chama a API e orienta a colar a mensagem', async () => {
    const deps = montar();
    const resultado = await executarIntencao(pedido, '   ', deps);
    expect(deps.assistente.verificarMensagem).not.toHaveBeenCalled();
    expect(resultado.tipo).toBe('aviso');
  });

  it('mensagem com mais de 2000 letras avisa em vez de enviar', async () => {
    const deps = montar();
    const resultado = await executarIntencao(pedido, 'a'.repeat(2001), deps);
    expect(deps.assistente.verificarMensagem).not.toHaveBeenCalled();
    expect(resultado.tipo).toBe('aviso');
  });

  it('se a API falhar, avisa para tentar de novo', async () => {
    const deps = montar();
    deps.assistente.verificarMensagem.mockRejectedValue(new ErroApi(0, 'sem conexao'));
    const resultado = await executarIntencao(pedido, 'mensagem', deps);
    expect(resultado.tipo).toBe('aviso');
  });
});

describe('executarIntencao - ZELADORIA_REPORT', () => {
  const pedido = (problemaRua: EntidadesDaFala['problemaRua'], extra = {}) =>
    resposta({
      intencao: 'ZELADORIA_REPORT',
      entidades: { ...SEM_ENTIDADES, problemaRua },
      ...extra,
    });

  it.each([
    ['BURACO', 'BURACO'],
    ['CALCADA_DANIFICADA', 'CALCADA'],
    ['RAMPA_BLOQUEADA', 'RAMPA'],
    ['ILUMINACAO', 'ILUMINACAO'],
    ['LIXO_OU_ENTULHO', 'LIXO'],
    ['ARVORE_CAIDA', 'OUTRO'],
    ['ALAGAMENTO', 'OUTRO'],
    ['OUTRO', 'OUTRO'],
  ] as const)(
    'problemaRua %s abre o formulario com a categoria %s',
    async (problema, categoria) => {
      const deps = montar();
      const resultado = await executarIntencao(pedido(problema), 'tem um problema', deps);
      expect(deps.navegar).toHaveBeenCalledWith({
        pathname: '/reportes/novo',
        params: { categoria, descricao: 'tem um problema' },
      });
      expect(resultado).toEqual({ tipo: 'feito' });
    },
  );

  it('leva a urgencia para o formulario e troca CRITICA por ALTA (o reporte nao tem CRITICA)', async () => {
    const deps = montar();
    await executarIntencao(pedido('BURACO', { urgencia: 'CRITICA' }), 'buraco', deps);
    expect(deps.navegar).toHaveBeenCalledWith({
      pathname: '/reportes/novo',
      params: { categoria: 'BURACO', urgencia: 'ALTA', descricao: 'buraco' },
    });
  });

  it('sem problema identificado nem texto, abre o formulario em branco', async () => {
    const deps = montar();
    await executarIntencao(pedido(null), '  ', deps);
    expect(deps.navegar).toHaveBeenCalledWith({ pathname: '/reportes/novo', params: {} });
  });
});

describe('executarIntencao - BUSCAR_ATENDIMENTO e DESCONHECIDA', () => {
  it.each(['BUSCAR_ATENDIMENTO', 'DESCONHECIDA'] as const)(
    '%s nao faz nada alem de mostrar',
    async (intencao) => {
      const deps = montar();
      const resultado = await executarIntencao(resposta({ intencao }), 'farmácia', deps);
      expect(resultado).toEqual({ tipo: 'nada' });
      expect(deps.navegar).not.toHaveBeenCalled();
      expect(deps.assistente.acionarEmergencia).not.toHaveBeenCalled();
      expect(deps.assistente.verificarMensagem).not.toHaveBeenCalled();
    },
  );
});
