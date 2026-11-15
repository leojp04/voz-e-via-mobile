import { criarClienteHttp } from '../cliente-http';
import { ErroApi } from '../erro';
import { criarAssistenteApiReal } from './assistente-api-real';

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
    obterToken: () => 'jwt-de-teste',
    fetchImpl: fetchSimulado as unknown as typeof fetch,
  });
  return criarAssistenteApiReal(cliente);
}

// Formato real do IntencaoResponse do Java (POST /api/v1/voz/intencoes).
const respostaDoJava = {
  intencao: 'BUSCAR_ATENDIMENTO',
  acao: 'MOSTRAR_ATENDIMENTOS',
  urgencia: 'ALTA',
  entidades: {
    tipoAtendimento: 'HOSPITAL',
    exigeAcessibilidade: true,
    problemaRua: null,
    impedeCadeirante: null,
    referenciaLocal: null,
  },
  mensagemFalada: 'O hospital mais perto fica a 800 metros.',
  confianca: 0.93,
  analisadoPor: 'IA_E_REGRAS',
  atendimentos: {
    tipo: 'HOSPITAL',
    atendimentos: [
      {
        id: 7,
        nome: 'Hospital Municipal',
        tipo: 'HOSPITAL',
        endereco: 'Rua A, 10',
        telefone: '1130000000',
        latitude: -23.5,
        longitude: -46.7,
        distanciaMetros: 800,
        acessibilidade: 'SIM',
        banheiroAdaptado: true,
        funciona24h: true,
        aviso: null,
        rotas: { googleMaps: 'https://maps/1', waze: 'https://waze/1', geo: 'geo:-23.5,-46.7' },
      },
    ],
    semAcessivelNoRaio: false,
    mensagemFalada: 'O hospital mais perto fica a 800 metros.',
    orientacaoEmergencia: 'Em urgência, ligue 192.',
    telefoneEmergencia: '192',
    observacao: null,
    creditoDados: '© Colaboradores do OpenStreetMap (ODbL)',
  },
};

describe('criarAssistenteApiReal.interpretar', () => {
  it('faz POST em /api/v1/voz/intencoes com texto e localizacao', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(200, respostaDoJava));

    const resultado = await criar(fetchSimulado).interpretar({
      texto: 'me leva no hospital mais perto',
      latitude: -23.5,
      longitude: -46.6,
    });

    const [url, init] = fetchSimulado.mock.calls[0];
    expect(url).toContain('/api/v1/voz/intencoes');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      texto: 'me leva no hospital mais perto',
      localizacao: { latitude: -23.5, longitude: -46.6 },
    });
    expect(resultado.intencao).toBe('BUSCAR_ATENDIMENTO');
    expect(resultado.urgencia).toBe('ALTA');
    expect(resultado.mensagemFalada).toBe('O hospital mais perto fica a 800 metros.');
    expect(resultado.entidades.tipoAtendimento).toBe('HOSPITAL');
    expect(resultado.atendimentos?.atendimentos[0].nome).toBe('Hospital Municipal');
    expect(resultado.atendimentos?.creditoDados).toContain('OpenStreetMap');
  });

  it('sem localizacao, nao manda o campo localizacao', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(200, respostaDoJava));

    await criar(fetchSimulado).interpretar({ texto: 'caí e não consigo levantar' });

    const [, init] = fetchSimulado.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ texto: 'caí e não consigo levantar' });
  });

  it('uma intencao fora da lista chega como DESCONHECIDA', async () => {
    const fetchSimulado = jest
      .fn()
      .mockResolvedValue(resposta(200, { ...respostaDoJava, intencao: 'APAGAR_TUDO' }));

    const resultado = await criar(fetchSimulado).interpretar({ texto: 'qualquer coisa' });

    expect(resultado.intencao).toBe('DESCONHECIDA');
  });

  it('campos que faltam na resposta viram valores seguros', async () => {
    const fetchSimulado = jest
      .fn()
      .mockResolvedValue(
        resposta(200, { intencao: 'SOCORRO', mensagemFalada: 'Posso pedir ajuda?' }),
      );

    const resultado = await criar(fetchSimulado).interpretar({ texto: 'socorro' });

    expect(resultado).toEqual({
      intencao: 'SOCORRO',
      urgencia: null,
      entidades: {
        tipoAtendimento: null,
        exigeAcessibilidade: null,
        problemaRua: null,
        impedeCadeirante: null,
        referenciaLocal: null,
      },
      mensagemFalada: 'Posso pedir ajuda?',
      confianca: 0,
      atendimentos: null,
    });
  });

  it('propaga o erro da API (400 com texto vazio)', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(400, { mensagem: 'Texto vazio.' }));

    await expect(criar(fetchSimulado).interpretar({ texto: '' })).rejects.toBeInstanceOf(ErroApi);
  });
});

describe('criarAssistenteApiReal.acionarEmergencia', () => {
  it('faz POST em /api/v1/emergencias com localizacao e a frase dita', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(
      resposta(201, {
        id: 12,
        status: 'ACIONADA',
        contatosNotificados: 2,
        mensagemFalada: 'Avisei seus contatos.',
      }),
    );

    const resultado = await criar(fetchSimulado).acionarEmergencia({
      latitude: -23.5,
      longitude: -46.6,
      textoOriginal: 'caí e não consigo levantar',
    });

    const [url, init] = fetchSimulado.mock.calls[0];
    expect(url).toContain('/api/v1/emergencias');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      latitude: -23.5,
      longitude: -46.6,
      textoOriginal: 'caí e não consigo levantar',
    });
    expect(resultado).toEqual({
      id: 12,
      contatosNotificados: 2,
      mensagemFalada: 'Avisei seus contatos.',
    });
  });

  it('sem GPS, manda so a frase; contatosNotificados ausente vira 0', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(201, { id: 1 }));

    const resultado = await criar(fetchSimulado).acionarEmergencia({ textoOriginal: 'socorro' });

    const [, init] = fetchSimulado.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ textoOriginal: 'socorro' });
    expect(resultado).toEqual({ id: 1, contatosNotificados: 0, mensagemFalada: '' });
  });
});

describe('criarAssistenteApiReal.verificarMensagem', () => {
  it('faz POST em /api/v1/verificacoes e devolve o parecer', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(
      resposta(200, {
        classificacao: 'PROVAVEL_GOLPE',
        tipoGolpe: 'FALSO_BENEFICIO',
        sinais: ['Link estranho', 'Urgência'],
        orientacao: 'Não clique no link.',
        canalOficial: 'Central 135',
        mensagemFalada: 'Isso parece golpe.',
        fontes: [{ titulo: 'Cartilha', orgao: 'INSS', url: 'https://inss.gov.br' }],
        analisadoPor: 'REGRAS',
        confianca: null,
      }),
    );

    const resultado = await criar(fetchSimulado).verificarMensagem({ texto: 'INSS: bloqueado' });

    const [url, init] = fetchSimulado.mock.calls[0];
    expect(url).toContain('/api/v1/verificacoes');
    expect(JSON.parse(init.body)).toEqual({ texto: 'INSS: bloqueado' });
    expect(resultado.classificacao).toBe('PROVAVEL_GOLPE');
    expect(resultado.sinais).toEqual(['Link estranho', 'Urgência']);
    expect(resultado.fontes[0].orgao).toBe('INSS');
  });

  it('campos que faltam viram valores seguros (nunca "sem risco" por omissao)', async () => {
    const fetchSimulado = jest.fn().mockResolvedValue(resposta(200, {}));

    const resultado = await criar(fetchSimulado).verificarMensagem({ texto: 'oi' });

    expect(resultado.classificacao).toBe('NAO_E_POSSIVEL_AVALIAR');
    expect(resultado.sinais).toEqual([]);
    expect(resultado.fontes).toEqual([]);
    expect(resultado.mensagemFalada).toBe('');
  });
});
