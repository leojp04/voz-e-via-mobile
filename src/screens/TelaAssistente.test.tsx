import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Linking, Text } from 'react-native';

import { ErroAparelho } from '../services/aparelho/erro-aparelho';
import { obterLocalizacao } from '../services/aparelho/localizacao';
import { ErroApi } from '../services/api/erro';
import type {
  AtendimentoProximo,
  EntidadesDaFala,
  RespostaAssistente,
  ResultadoEmergencia,
  ResultadoVerificacao,
} from '../services/api/types';
import { falar, pararDeFalar } from '../services/voz/falar';
import { useEscutaDeVoz, type EscutaDeVoz } from '../services/voz/use-escuta-de-voz';
import {
  criarArmazenamentoEmMemoria,
  criarAssistenteApiMock,
  criarAuthApiMock,
  montarTela,
  sessaoDeTeste,
} from '../test-utils/montar-tela';
import { ligarPara } from '../utils/ligar-para';
import { abrirNoMapa } from '../utils/url-do-mapa';
import { localParaBuscar, TelaAssistente } from './TelaAssistente';

// O Ionicons tenta carregar um arquivo de fonte (que nao existe no Jest); o icone e decorativo.
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
// Discador, mapa e GPS sao do aparelho: aqui so conferimos que a tela os aciona.
jest.mock('../utils/ligar-para');
jest.mock('../utils/url-do-mapa');
jest.mock('../services/aparelho/localizacao');
// Voz (microfone e fala) e nativa: a logica da escuta ja tem teste proprio, aqui a tela recebe o
// estado pronto e so conferimos o que ela desenha e quando manda parar de falar.
jest.mock('../services/voz/falar');
jest.mock('../services/voz/use-escuta-de-voz');

const escuta = useEscutaDeVoz as jest.Mock;
const alternar = jest.fn();
const aceitarAviso = jest.fn();
const recusarAviso = jest.fn();

function simularEscuta(estado: Partial<EscutaDeVoz> = {}) {
  escuta.mockReturnValue({
    disponivel: true,
    ouvindo: false,
    precisaAviso: false,
    erro: null,
    alternar,
    aceitarAviso,
    recusarAviso,
    ...estado,
  });
}

/** Simula o aparelho entregando texto falado: chama o "aoTexto" que a tela deu ao hook. */
async function aparelhoOuviu(texto: string, final = true) {
  const { aoTexto } = escuta.mock.calls[escuta.mock.calls.length - 1][0];
  await act(async () => aoTexto(texto, final));
}

beforeEach(() => {
  jest.clearAllMocks();
  (falar as jest.Mock).mockResolvedValue(undefined);
  (pararDeFalar as jest.Mock).mockResolvedValue(undefined);
  simularEscuta();
});

afterEach(() => jest.restoreAllMocks());

const SEM_ENTIDADES: EntidadesDaFala = {
  tipoAtendimento: null,
  exigeAcessibilidade: null,
  problemaRua: null,
  impedeCadeirante: null,
  referenciaLocal: null,
};

function resposta(parcial: Partial<RespostaAssistente>): RespostaAssistente {
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

const zeladoria = resposta({
  intencao: 'ZELADORIA_REPORT',
  urgencia: 'ALTA',
  entidades: { ...SEM_ENTIDADES, problemaRua: 'CALCADA_DANIFICADA' },
  mensagemFalada: 'Entendi. Vou registrar uma calçada quebrada. Posso abrir o formulário?',
});

const desconhecida = resposta({
  intencao: 'DESCONHECIDA',
  mensagemFalada: 'Não entendi. Pode repetir de outro jeito?',
});

const socorro = resposta({
  intencao: 'SOCORRO',
  urgencia: 'CRITICA',
  mensagemFalada: 'Você precisa de ajuda? Posso avisar seus contatos agora.',
});

const verificar = resposta({
  intencao: 'VERIFICAR_INFORMACAO',
  mensagemFalada: 'Vou checar essa mensagem para você.',
});

const buscarSemLista = resposta({
  intencao: 'BUSCAR_ATENDIMENTO',
  entidades: { ...SEM_ENTIDADES, tipoAtendimento: 'FARMACIA' },
  mensagemFalada: 'Vou procurar uma farmácia.',
});

const EMERGENCIA: ResultadoEmergencia = {
  id: 7,
  contatosNotificados: 2,
  mensagemFalada: 'Avisei seus contatos. Fique onde está.',
};

const VERIFICACAO: ResultadoVerificacao = {
  classificacao: 'PROVAVEL_GOLPE',
  tipoGolpe: 'FALSO_PARENTE',
  sinais: ['Pede dinheiro com urgência'],
  orientacao: 'Não faça o Pix. Ligue para a pessoa no número que você já tem.',
  canalOficial: null,
  mensagemFalada: 'Isso parece golpe.',
  fontes: [],
};

const farmacia: AtendimentoProximo = {
  id: 1,
  nome: 'Farmácia Exemplo',
  tipo: 'FARMACIA',
  endereco: 'Rua das Flores, 120 - Centro',
  telefone: '1133334444',
  latitude: -23.55,
  longitude: -46.63,
  distanciaMetros: 350,
  acessibilidade: 'SIM',
  banheiroAdaptado: null,
  funciona24h: null,
  aviso: null,
  rotas: { googleMaps: 'https://maps.example/1', waze: 'https://waze.example/1', geo: 'geo:0,0' },
};

const CREDITO = '© Colaboradores do OpenStreetMap (ODbL)';

function buscarComLista(parcial: Partial<NonNullable<RespostaAssistente['atendimentos']>> = {}) {
  return resposta({
    intencao: 'BUSCAR_ATENDIMENTO',
    entidades: { ...SEM_ENTIDADES, tipoAtendimento: 'FARMACIA' },
    mensagemFalada: 'Achei uma farmácia a 350 metros.',
    atendimentos: {
      tipo: 'FARMACIA',
      atendimentos: [farmacia],
      semAcessivelNoRaio: false,
      mensagemFalada: 'Achei uma farmácia a 350 metros.',
      orientacaoEmergencia: null,
      telefoneEmergencia: null,
      observacao: null,
      creditoDados: CREDITO,
      ...parcial,
    },
  });
}

function InicioFalso() {
  return <Text>Início de mentira</Text>;
}

function NovoReporteFalso() {
  return <Text>Novo reporte de mentira</Text>;
}

type AssistenteMock = ReturnType<typeof criarAssistenteApiMock>;

async function montar(configurar: (api: AssistenteMock) => void = () => {}) {
  const assistente = criarAssistenteApiMock();
  configurar(assistente);
  await montarTela(InicioFalso, {
    auth: criarAuthApiMock(),
    assistente,
    armazenamento: criarArmazenamentoEmMemoria(sessaoDeTeste),
    rotas: { assistente: TelaAssistente, 'reportes/novo': NovoReporteFalso },
    url: '/assistente',
  });
  return assistente;
}

async function digitarEEnviar(texto: string) {
  await fireEvent.changeText(screen.getByLabelText('O que você precisa?'), texto);
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar ao assistente' }));
}

describe('TelaAssistente', () => {
  it('mostra o título, o campo de texto e o botão de enviar', async () => {
    await montar();
    expect(await screen.findByRole('header', { name: 'Assistente' })).toBeOnTheScreen();
    expect(screen.getByLabelText('O que você precisa?')).toHaveProp('value', '');
    expect(screen.getByRole('button', { name: 'Enviar ao assistente' })).toBeOnTheScreen();
  });

  it('texto vazio mostra o erro no campo e não chama a API', async () => {
    const assistente = await montar();
    await screen.findByRole('header', { name: 'Assistente' });

    await fireEvent.press(screen.getByRole('button', { name: 'Enviar ao assistente' }));

    expect(screen.getByText('Escreva o que você precisa.')).toBeOnTheScreen();
    expect(assistente.interpretar).not.toHaveBeenCalled();
  });

  it('texto só com espaços também não chama a API', async () => {
    const assistente = await montar();
    await screen.findByRole('header', { name: 'Assistente' });

    await digitarEEnviar('    ');

    expect(screen.getByText('Escreva o que você precisa.')).toBeOnTheScreen();
    expect(assistente.interpretar).not.toHaveBeenCalled();
  });

  it('texto com mais de 500 letras (limite do Java) mostra o erro e não chama a API', async () => {
    const assistente = await montar();
    await screen.findByRole('header', { name: 'Assistente' });

    await digitarEEnviar('a'.repeat(501));

    expect(screen.getByText('Escreva até 500 letras.')).toBeOnTheScreen();
    expect(assistente.interpretar).not.toHaveBeenCalled();
  });

  it('envia o texto sem espaços nas pontas, SEM GPS, e mostra a resposta falada', async () => {
    const assistente = await montar((api) => api.interpretar.mockResolvedValue(zeladoria));
    await screen.findByRole('header', { name: 'Assistente' });

    await digitarEEnviar('  a calçada está quebrada  ');

    expect(await screen.findByText(zeladoria.mensagemFalada)).toBeOnTheScreen();
    expect(assistente.interpretar).toHaveBeenCalledWith({ texto: 'a calçada está quebrada' });
    // A promessa da tela de Privacidade: o GPS so e lido num toque, nunca no envio.
    expect(obterLocalizacao).not.toHaveBeenCalled();
  });

  it('DESCONHECIDA só mostra a frase: nenhum botão de ação', async () => {
    await montar((api) => api.interpretar.mockResolvedValue(desconhecida));
    await screen.findByRole('header', { name: 'Assistente' });

    await digitarEEnviar('blablabla');

    expect(await screen.findByText(desconhecida.mensagemFalada)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Sim,/ })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Não, cancelar' })).not.toBeOnTheScreen();
  });

  it('mexer no texto apaga a sugestão antiga (não dá para confirmar o que não é mais o texto)', async () => {
    await montar((api) => api.interpretar.mockResolvedValue(zeladoria));
    await screen.findByRole('header', { name: 'Assistente' });
    await digitarEEnviar('calçada quebrada');
    await screen.findByText(zeladoria.mensagemFalada);

    await fireEvent.changeText(screen.getByLabelText('O que você precisa?'), 'socorro');

    expect(screen.queryByText(zeladoria.mensagemFalada)).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Sim, abrir o formulário' })).not.toBeOnTheScreen();
  });

  it('erro da API mostra a frase amigável, diz que nada foi feito e não mostra sugestão', async () => {
    await montar((api) =>
      api.interpretar.mockRejectedValue(new ErroApi(0, 'Network request failed')),
    );
    await screen.findByRole('header', { name: 'Assistente' });

    await digitarEEnviar('socorro');

    expect(
      await screen.findByText('Sem conexão. Nada foi feito. Tente de novo.'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Sim,/ })).not.toBeOnTheScreen();
  });

  it('um novo envio com sucesso apaga o erro anterior', async () => {
    await montar((api) =>
      api.interpretar
        .mockRejectedValueOnce(new ErroApi(0, 'Network request failed'))
        .mockResolvedValueOnce(desconhecida),
    );
    await screen.findByRole('header', { name: 'Assistente' });
    await digitarEEnviar('direito');
    await screen.findByText('Sem conexão. Nada foi feito. Tente de novo.');

    await fireEvent.press(screen.getByRole('button', { name: 'Enviar ao assistente' }));

    expect(await screen.findByText(desconhecida.mensagemFalada)).toBeOnTheScreen();
    expect(screen.queryByText('Sem conexão. Nada foi feito. Tente de novo.')).not.toBeOnTheScreen();
  });

  it('dois toques seguidos em "Enviar" chamam a API uma vez só', async () => {
    let resolver: (r: RespostaAssistente) => void = () => {};
    const assistente = await montar((api) =>
      api.interpretar.mockReturnValue(new Promise<RespostaAssistente>((r) => (resolver = r))),
    );
    await screen.findByRole('header', { name: 'Assistente' });
    await fireEvent.changeText(screen.getByLabelText('O que você precisa?'), 'socorro');
    const botao = screen.getByRole('button', { name: 'Enviar ao assistente' });

    await fireEvent.press(botao);
    await fireEvent.press(botao);
    resolver(zeladoria);

    await screen.findByText(zeladoria.mensagemFalada);
    expect(assistente.interpretar).toHaveBeenCalledTimes(1);
  });

  it('"Voltar" leva para o Início', async () => {
    await montar();
    await screen.findByRole('header', { name: 'Assistente' });

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    await waitFor(() => expect(screen.getByText('Início de mentira')).toBeOnTheScreen());
  });
});

describe('TelaAssistente: ZELADORIA_REPORT', () => {
  it('mostra "Sim, abrir o formulário" e "Não, cancelar", e nada acontece antes do toque', async () => {
    await montar((api) => api.interpretar.mockResolvedValue(zeladoria));
    await screen.findByRole('header', { name: 'Assistente' });

    await digitarEEnviar('calçada quebrada');

    expect(
      await screen.findByRole('button', { name: 'Sim, abrir o formulário' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Não, cancelar' })).toBeOnTheScreen();
    expect(screen).toHavePathname('/assistente');
  });

  it('"Não, cancelar" some com a sugestão e fica na tela', async () => {
    await montar((api) => api.interpretar.mockResolvedValue(zeladoria));
    await screen.findByRole('header', { name: 'Assistente' });
    await digitarEEnviar('calçada quebrada');
    await screen.findByText(zeladoria.mensagemFalada);

    await fireEvent.press(screen.getByRole('button', { name: 'Não, cancelar' }));

    expect(screen.queryByText(zeladoria.mensagemFalada)).not.toBeOnTheScreen();
    expect(screen).toHavePathname('/assistente');
  });

  it('"Sim, abrir o formulário" abre o novo reporte já preenchido', async () => {
    await montar((api) => api.interpretar.mockResolvedValue(zeladoria));
    await screen.findByRole('header', { name: 'Assistente' });
    await digitarEEnviar('calçada quebrada');
    await screen.findByText(zeladoria.mensagemFalada);

    await fireEvent.press(screen.getByRole('button', { name: 'Sim, abrir o formulário' }));

    await waitFor(() => expect(screen).toHavePathname('/reportes/novo'));
    expect(screen).toHaveSearchParams({
      categoria: 'CALCADA',
      urgencia: 'ALTA',
      descricao: 'calçada quebrada',
    });
  });
});

describe('TelaAssistente: SOCORRO', () => {
  async function chegarNaConfirmacao(configurar?: (api: AssistenteMock) => void) {
    jest.mocked(obterLocalizacao).mockResolvedValue({ latitude: -23.5, longitude: -46.6 });
    const assistente = await montar((api) => {
      api.interpretar.mockResolvedValue(socorro);
      api.acionarEmergencia.mockResolvedValue(EMERGENCIA);
      configurar?.(api);
    });
    await screen.findByRole('header', { name: 'Assistente' });
    await digitarEEnviar('socorro, caí');
    await screen.findByText(socorro.mensagemFalada);
    return assistente;
  }

  it('só pergunta: nenhum alerta sai antes do toque em "Sim, avisar meus contatos"', async () => {
    const assistente = await chegarNaConfirmacao();
    expect(screen.getByRole('button', { name: 'Sim, avisar meus contatos' })).toBeOnTheScreen();
    expect(assistente.acionarEmergencia).not.toHaveBeenCalled();
  });

  it('ao confirmar, avisa os contatos com o GPS e a frase dita, e mostra o resultado', async () => {
    const assistente = await chegarNaConfirmacao();

    await fireEvent.press(screen.getByRole('button', { name: 'Sim, avisar meus contatos' }));

    expect(await screen.findByText(EMERGENCIA.mensagemFalada)).toBeOnTheScreen();
    expect(screen.getByText('Contatos avisados: 2')).toBeOnTheScreen();
    expect(assistente.acionarEmergencia).toHaveBeenCalledWith({
      latitude: -23.5,
      longitude: -46.6,
      textoOriginal: 'socorro, caí',
    });
    expect(
      screen.queryByRole('button', { name: 'Sim, avisar meus contatos' }),
    ).not.toBeOnTheScreen();
  });

  it('oferece "Ligar 192" depois do aviso, e o toque abre o discador', async () => {
    await chegarNaConfirmacao();
    await fireEvent.press(screen.getByRole('button', { name: 'Sim, avisar meus contatos' }));

    await fireEvent.press(await screen.findByRole('button', { name: 'Ligar para o SAMU, 192' }));

    expect(ligarPara).toHaveBeenCalledWith('192');
  });

  it('se o aviso falhar, diz isso e manda ligar para o SAMU (nunca finge que avisou)', async () => {
    await chegarNaConfirmacao((api) =>
      api.acionarEmergencia.mockRejectedValue(new ErroApi(0, 'sem conexao')),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Sim, avisar meus contatos' }));

    expect(await screen.findByText(/Não foi possível avisar seus contatos/)).toBeOnTheScreen();
    expect(screen.queryByText(EMERGENCIA.mensagemFalada)).not.toBeOnTheScreen();
  });

  it('se o aviso falhar, o botão "Ligar 192" continua a um toque', async () => {
    await chegarNaConfirmacao((api) =>
      api.acionarEmergencia.mockRejectedValue(new ErroApi(0, 'sem conexao')),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Sim, avisar meus contatos' }));
    await screen.findByText(/Não foi possível avisar seus contatos/);

    await fireEvent.press(screen.getByRole('button', { name: 'Ligar para o SAMU, 192' }));

    expect(ligarPara).toHaveBeenCalledWith('192');
  });

  it('mexer no texto apaga o resultado do alerta anterior', async () => {
    await chegarNaConfirmacao();
    await fireEvent.press(screen.getByRole('button', { name: 'Sim, avisar meus contatos' }));
    await screen.findByText(EMERGENCIA.mensagemFalada);

    await fireEvent.changeText(screen.getByLabelText('O que você precisa?'), 'outra coisa');

    expect(screen.queryByText(EMERGENCIA.mensagemFalada)).not.toBeOnTheScreen();
  });
});

describe('TelaAssistente: VERIFICAR_INFORMACAO', () => {
  const MENSAGEM = 'mãe, troquei de número, faz um pix';

  async function chegarNaConfirmacao(configurar?: (api: AssistenteMock) => void) {
    const assistente = await montar((api) => {
      api.interpretar.mockResolvedValue(verificar);
      api.verificarMensagem.mockResolvedValue(VERIFICACAO);
      configurar?.(api);
    });
    await screen.findByRole('header', { name: 'Assistente' });
    await digitarEEnviar(MENSAGEM);
    await screen.findByText(verificar.mensagemFalada);
    return assistente;
  }

  it('só verifica depois do toque em "Sim, verificar"', async () => {
    const assistente = await chegarNaConfirmacao();
    expect(assistente.verificarMensagem).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sim, verificar' })).toBeOnTheScreen();
  });

  it('ao confirmar, manda a mensagem e mostra o parecer', async () => {
    const assistente = await chegarNaConfirmacao();

    await fireEvent.press(screen.getByRole('button', { name: 'Sim, verificar' }));

    expect(await screen.findByText('Provável golpe')).toBeOnTheScreen();
    expect(screen.getByText(VERIFICACAO.orientacao)).toBeOnTheScreen();
    expect(assistente.verificarMensagem).toHaveBeenCalledWith({ texto: MENSAGEM });
  });

  it('se a verificação falhar, mostra o aviso e não mostra parecer', async () => {
    await chegarNaConfirmacao((api) =>
      api.verificarMensagem.mockRejectedValue(new ErroApi(0, 'sem conexao')),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Sim, verificar' }));

    expect(await screen.findByText(/Não foi possível verificar agora/)).toBeOnTheScreen();
    expect(screen.queryByText('Provável golpe')).not.toBeOnTheScreen();
  });
});

describe('TelaAssistente: BUSCAR_ATENDIMENTO', () => {
  async function buscar(resp: RespostaAssistente) {
    const assistente = await montar((api) => api.interpretar.mockResolvedValue(resp));
    await screen.findByRole('header', { name: 'Assistente' });
    await digitarEEnviar('farmácia perto de mim');
    return assistente;
  }

  const USAR_GPS = 'Usar minha localização para achar a farmácia mais perto';

  it('com a lista pronta, mostra os atendimentos e o crédito do OpenStreetMap (ODbL)', async () => {
    await buscar(buscarComLista());

    expect(await screen.findByText('Farmácia Exemplo')).toBeOnTheScreen();
    expect(screen.getByText(CREDITO)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Sim,/ })).not.toBeOnTheScreen();
  });

  it('"Ligar" no atendimento abre o discador com o telefone dele', async () => {
    await buscar(buscarComLista());

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Ligar para Farmácia Exemplo' }),
    );

    expect(ligarPara).toHaveBeenCalledWith('1133334444');
  });

  it('"Ver no mapa" abre o app de mapas no ponto do atendimento', async () => {
    await buscar(buscarComLista());

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Ver Farmácia Exemplo no mapa' }),
    );

    expect(abrirNoMapa).toHaveBeenCalledWith(-23.55, -46.63);
  });

  it('responde a pergunta "quer que eu abra o caminho?": botao abre o mapa no atendimento mais perto', async () => {
    await buscar(buscarComLista());

    await fireEvent.press(
      await screen.findByRole('button', {
        name: 'Abrir o caminho até Farmácia Exemplo, o mais perto de você',
      }),
    );

    expect(abrirNoMapa).toHaveBeenCalledWith(-23.55, -46.63);
  });

  it('sem atendimentos na lista, nao oferece abrir o caminho', async () => {
    await buscar(buscarComLista({ atendimentos: [] }));

    expect(await screen.findByText('Não encontrei atendimentos por perto.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Abrir o caminho/ })).not.toBeOnTheScreen();
  });

  it('hospital/UPA: mostra a orientação do Java e o botão para ligar ao número de emergência', async () => {
    await buscar(
      buscarComLista({
        orientacaoEmergencia: 'Em emergência, ligue 192.',
        telefoneEmergencia: '192',
      }),
    );

    expect(await screen.findByText('Em emergência, ligue 192.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Ligar para o SAMU, 192' }));
    expect(ligarPara).toHaveBeenCalledWith('192');
  });

  it('mostra a observação do Java quando existe', async () => {
    await buscar(buscarComLista({ observacao: 'Horários podem mudar.' }));
    expect(await screen.findByText('Horários podem mudar.')).toBeOnTheScreen();
  });

  it('sem nenhum local acessível confirmado no raio, avisa com clareza', async () => {
    await buscar(buscarComLista({ semAcessivelNoRaio: true }));
    expect(
      await screen.findByText(/Nenhum local confirmado como acessível por perto/),
    ).toBeOnTheScreen();
  });

  it('lista vazia diz que nada foi encontrado e ainda mostra o crédito', async () => {
    await buscar(buscarComLista({ atendimentos: [] }));
    expect(await screen.findByText('Não encontrei atendimentos por perto.')).toBeOnTheScreen();
    expect(screen.getByText(CREDITO)).toBeOnTheScreen();
  });

  it('sem lista (o Java não recebeu o GPS), oferece "Usar minha localização" e não lê o GPS sozinho', async () => {
    await buscar(buscarSemLista);

    expect(await screen.findByRole('button', { name: USAR_GPS })).toBeOnTheScreen();
    expect(obterLocalizacao).not.toHaveBeenCalled();
  });

  it('"Usar minha localização" reenvia a MESMA frase com o GPS e mostra a lista', async () => {
    jest.mocked(obterLocalizacao).mockResolvedValue({ latitude: -23.5, longitude: -46.6 });
    const assistente = await montar((api) =>
      api.interpretar.mockResolvedValueOnce(buscarSemLista).mockResolvedValueOnce(buscarComLista()),
    );
    await screen.findByRole('header', { name: 'Assistente' });
    await digitarEEnviar('farmácia perto de mim');

    await fireEvent.press(await screen.findByRole('button', { name: USAR_GPS }));

    expect(await screen.findByText('Farmácia Exemplo')).toBeOnTheScreen();
    expect(assistente.interpretar).toHaveBeenLastCalledWith({
      texto: 'farmácia perto de mim',
      latitude: -23.5,
      longitude: -46.6,
    });
  });

  it('GPS negado: mostra o aviso do aparelho, não reenvia e o botão continua disponível', async () => {
    jest
      .mocked(obterLocalizacao)
      .mockRejectedValue(new ErroAparelho('PERMISSAO_NEGADA', 'Permita o acesso à localização.'));
    const assistente = await buscar(buscarSemLista);

    await fireEvent.press(await screen.findByRole('button', { name: USAR_GPS }));

    expect(await screen.findByText('Permita o acesso à localização.')).toBeOnTheScreen();
    expect(assistente.interpretar).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: USAR_GPS })).toBeOnTheScreen();
  });

  it('sem o tipo de lugar, não oferece a localização (ela não resolve e o pedido voltava igual, em loop)', async () => {
    await buscar(
      resposta({
        intencao: 'BUSCAR_ATENDIMENTO',
        mensagemFalada: 'Que lugar você procura? Posso achar hospital, UPA ou farmácia.',
      }),
    );

    expect(await screen.findByText(/Que lugar você procura/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Usar minha localização/ })).not.toBeOnTheScreen();
  });
});

describe('TelaAssistente: dúvida sobre serviço público', () => {
  const ORIENTACAO = {
    titulo: 'BPC para pessoa idosa',
    resumo: 'O BPC paga um salário mínimo por mês ao idoso a partir de 65 anos com renda baixa.',
    passos: ['Faça o Cadastro Único no CRAS.', 'Peça o BPC pelo Meu INSS ou ligando 135.'],
    link: 'https://www.gov.br/pt-br/servicos/solicitar-beneficio-assistencial-ao-idoso',
    telefone: '135',
    orgao: 'INSS',
    localPresencial: 'CRAS' as const,
    sobreGolpe: false,
  };
  const duvida = resposta({
    intencao: 'TIRAR_DUVIDA',
    mensagemFalada: ORIENTACAO.resumo,
    entidades: { ...SEM_ENTIDADES, tipoAtendimento: 'CRAS' },
    orientacao: ORIENTACAO,
  });

  async function perguntar(resp: RespostaAssistente) {
    const assistente = await montar((api) => api.interpretar.mockResolvedValue(resp));
    await screen.findByRole('header', { name: 'Assistente' });
    await digitarEEnviar('meu pai tem direito ao bpc?');
    return assistente;
  }

  it('mostra os passos, o site oficial e a central gratuita, sem botão de "Sim"', async () => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await perguntar(duvida);

    expect(await screen.findByText('1. Faça o Cadastro Único no CRAS.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Sim,/ })).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Abrir o site oficial, gov.br' }));
    expect(Linking.openURL).toHaveBeenCalledWith(ORIENTACAO.link);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Ligar para a central gratuita, 135' }),
    );
    expect(ligarPara).toHaveBeenCalledWith('135');
  });

  it('com atendimento presencial, oferece achar o CRAS mais perto pela localização', async () => {
    jest.mocked(obterLocalizacao).mockResolvedValue({ latitude: -23.5, longitude: -46.6 });
    const assistente = await perguntar(duvida);

    await fireEvent.press(
      await screen.findByRole('button', {
        name: 'Usar minha localização para achar o CRAS mais perto',
      }),
    );

    expect(assistente.interpretar).toHaveBeenLastCalledWith({
      texto: 'meu pai tem direito ao bpc?',
      latitude: -23.5,
      longitude: -46.6,
    });
  });

  it('dúvida aberta: mostra a resposta e a fonte, sem botão de site nem de ligar', async () => {
    await perguntar(
      resposta({
        intencao: 'TIRAR_DUVIDA',
        mensagemFalada: 'Sim, idosos têm prioridade na fila do banco. Confirme no gov.br.',
        orientacao: {
          titulo: 'Resposta do assistente',
          resumo: 'Sim, idosos têm prioridade na fila do banco. Confirme no gov.br.',
          passos: [],
          link: null,
          telefone: null,
          orgao: 'Assistente VozViva. Confirme nos canais oficiais',
          localPresencial: null,
          sobreGolpe: false,
        },
      }),
    );

    expect(await screen.findByText(/idosos têm prioridade na fila do banco/)).toBeOnTheScreen();
    expect(screen.getByText('Assistente VozViva. Confirme nos canais oficiais')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Abrir o site oficial/ })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /central gratuita/ })).not.toBeOnTheScreen();
  });

  it('sem atendimento presencial, não pede a localização', async () => {
    await perguntar(resposta({ ...duvida, orientacao: { ...ORIENTACAO, localPresencial: null } }));

    expect(await screen.findByText('1. Faça o Cadastro Único no CRAS.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Usar minha localização/ })).not.toBeOnTheScreen();
  });
});

describe('TelaAssistente: ouvir mais devagar', () => {
  it('lê a resposta de novo, mais devagar', async () => {
    await montar((api) =>
      api.interpretar.mockResolvedValue(resposta({ mensagemFalada: 'Ligue 135.' })),
    );
    await screen.findByRole('header', { name: 'Assistente' });
    await digitarEEnviar('como peço a aposentadoria?');

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Ouvir a resposta mais devagar' }),
    );

    expect(falar).toHaveBeenLastCalledWith('Ligue 135.', true);
  });
});

describe('localParaBuscar', () => {
  it('só pede a localização quando ela ajuda a achar um tipo de lugar', () => {
    const base = resposta({ intencao: 'BUSCAR_ATENDIMENTO' });
    expect(localParaBuscar(base)).toBeNull();
    expect(
      localParaBuscar({ ...base, entidades: { ...SEM_ENTIDADES, tipoAtendimento: 'UBS' } }),
    ).toBe('UBS');
    expect(localParaBuscar(resposta({ intencao: 'SOCORRO' }))).toBeNull();
    expect(localParaBuscar(resposta({ intencao: 'TIRAR_DUVIDA' }))).toBeNull();
  });
});

describe('TelaAssistente: voz', () => {
  const MIC = 'Falar com o assistente por voz';
  const LER_SEMPRE = 'Ler sempre a resposta em voz alta';

  async function montarComResposta(resp: RespostaAssistente) {
    const assistente = await montar((api) => api.interpretar.mockResolvedValue(resp));
    await screen.findByRole('header', { name: 'Assistente' });
    return assistente;
  }

  describe('microfone', () => {
    it('mostra o botão do microfone e um toque manda o hook começar a ouvir', async () => {
      await montar();
      await fireEvent.press(await screen.findByRole('button', { name: MIC }));
      expect(alternar).toHaveBeenCalledTimes(1);
    });

    it('enquanto ouve, o botão vira "Parar de ouvir"', async () => {
      simularEscuta({ ouvindo: true });
      await montar();
      expect(await screen.findByRole('button', { name: 'Parar de ouvir' })).toBeOnTheScreen();
    });

    it('sem reconhecedor no aparelho, esconde o microfone e manda digitar', async () => {
      simularEscuta({ disponivel: false });
      await montar();
      await screen.findByRole('header', { name: 'Assistente' });
      expect(screen.queryByRole('button', { name: MIC })).not.toBeOnTheScreen();
      expect(
        screen.getByText('Voz indisponível neste aparelho. Digite o que você precisa.'),
      ).toBeOnTheScreen();
    });

    it('com o microfone disponível, não mostra o aviso de voz indisponível', async () => {
      await montar();
      await screen.findByRole('header', { name: 'Assistente' });
      expect(screen.queryByText(/Voz indisponível/)).not.toBeOnTheScreen();
    });

    it('mostra o erro da voz numa faixa de alerta', async () => {
      simularEscuta({ erro: 'Não ouvi nada. Toque no microfone e fale de novo.' });
      await montar();
      expect(await screen.findByText(/Não ouvi nada/)).toBeOnTheScreen();
    });
  });

  describe('texto falado', () => {
    it('preenche o campo e NÃO envia sozinho (a pessoa confere e toca em Enviar)', async () => {
      const assistente = await montar();
      await screen.findByRole('header', { name: 'Assistente' });
      await aparelhoOuviu('farmácia perto');
      expect(screen.getByLabelText('O que você precisa?')).toHaveProp('value', 'farmácia perto');
      expect(assistente.interpretar).not.toHaveBeenCalled();
    });

    it('acompanha o texto parcial enquanto a pessoa fala', async () => {
      await montar();
      await screen.findByRole('header', { name: 'Assistente' });
      await aparelhoOuviu('farmácia', false);
      expect(screen.getByLabelText('O que você precisa?')).toHaveProp('value', 'farmácia');
      await aparelhoOuviu('farmácia perto', true);
      expect(screen.getByLabelText('O que você precisa?')).toHaveProp('value', 'farmácia perto');
    });

    it('apaga a sugestão antiga, que era de outro texto', async () => {
      await montarComResposta(zeladoria);
      await digitarEEnviar('calçada quebrada');
      await screen.findByText(zeladoria.mensagemFalada);
      await aparelhoOuviu('outra coisa');
      expect(screen.queryByText(zeladoria.mensagemFalada)).not.toBeOnTheScreen();
    });

    it('o texto falado pode ser enviado pelo botão Enviar', async () => {
      const assistente = await montarComResposta(desconhecida);
      await aparelhoOuviu('quais são meus direitos');
      await fireEvent.press(screen.getByRole('button', { name: 'Enviar ao assistente' }));
      await screen.findByText(desconhecida.mensagemFalada);
      expect(assistente.interpretar).toHaveBeenCalledWith({ texto: 'quais são meus direitos' });
    });
  });

  describe('aviso antes do reconhecedor do sistema', () => {
    it('não aparece quando não é preciso', async () => {
      await montar();
      await screen.findByRole('header', { name: 'Assistente' });
      expect(screen.queryByText(/Apple ou do Google/)).not.toBeOnTheScreen();
    });

    it('explica que o sistema (Apple ou Google) pode processar o áudio e que só o texto vai para a API', async () => {
      simularEscuta({ precisaAviso: true });
      await montar();
      expect(await screen.findByText(/Apple ou do Google/)).toBeOnTheScreen();
      expect(screen.getByText(/só o texto/i)).toBeOnTheScreen();
    });

    it('"Entendi, usar a voz" aceita o aviso', async () => {
      simularEscuta({ precisaAviso: true });
      await montar();
      await fireEvent.press(await screen.findByRole('button', { name: 'Entendi, usar a voz' }));
      expect(aceitarAviso).toHaveBeenCalledTimes(1);
    });

    it('"Prefiro digitar" recusa o aviso', async () => {
      simularEscuta({ precisaAviso: true });
      await montar();
      await fireEvent.press(await screen.findByRole('button', { name: 'Prefiro digitar' }));
      expect(recusarAviso).toHaveBeenCalledTimes(1);
    });
  });

  describe('ler a resposta em voz alta', () => {
    it('o interruptor "Ler sempre a resposta" começa ligado', async () => {
      await montar();
      expect(await screen.findByRole('checkbox', { name: LER_SEMPRE })).toBeChecked();
    });

    it('ligado: lê a resposta mesmo quando a pergunta foi digitada', async () => {
      await montarComResposta(desconhecida);
      await digitarEEnviar('meus direitos');
      await screen.findByText(desconhecida.mensagemFalada);
      expect(falar).toHaveBeenCalledWith(desconhecida.mensagemFalada);
    });

    it('desligado: pergunta digitada não é lida', async () => {
      await montarComResposta(desconhecida);
      await fireEvent.press(screen.getByRole('checkbox', { name: LER_SEMPRE }));
      await digitarEEnviar('meus direitos');
      await screen.findByText(desconhecida.mensagemFalada);
      expect(falar).not.toHaveBeenCalled();
    });

    it('desligado: pergunta feita por voz é lida', async () => {
      await montarComResposta(desconhecida);
      await fireEvent.press(screen.getByRole('checkbox', { name: LER_SEMPRE }));
      await aparelhoOuviu('meus direitos');
      await fireEvent.press(screen.getByRole('button', { name: 'Enviar ao assistente' }));
      await screen.findByText(desconhecida.mensagemFalada);
      expect(falar).toHaveBeenCalledWith(desconhecida.mensagemFalada);
    });

    it('desligado: depois de falar, se a pessoa digitar por cima, volta a não ler', async () => {
      await montarComResposta(desconhecida);
      await fireEvent.press(screen.getByRole('checkbox', { name: LER_SEMPRE }));
      await aparelhoOuviu('meus direitos');
      await digitarEEnviar('meus direitos de novo');
      await screen.findByText(desconhecida.mensagemFalada);
      expect(falar).not.toHaveBeenCalled();
    });

    it('"Ouvir de novo" lê a resposta outra vez, com o interruptor desligado também', async () => {
      await montarComResposta(desconhecida);
      await fireEvent.press(screen.getByRole('checkbox', { name: LER_SEMPRE }));
      await digitarEEnviar('meus direitos');
      await screen.findByText(desconhecida.mensagemFalada);
      await fireEvent.press(screen.getByRole('button', { name: 'Ouvir a resposta de novo' }));
      expect(falar).toHaveBeenCalledWith(desconhecida.mensagemFalada);
    });

    it('não mostra "Ouvir de novo" quando ainda não há resposta', async () => {
      await montar();
      await screen.findByRole('header', { name: 'Assistente' });
      expect(
        screen.queryByRole('button', { name: 'Ouvir a resposta de novo' }),
      ).not.toBeOnTheScreen();
    });

    it('lê também o resultado do aviso de emergência', async () => {
      jest.mocked(obterLocalizacao).mockResolvedValue({ latitude: -23.5, longitude: -46.6 });
      await montar((api) => {
        api.interpretar.mockResolvedValue(socorro);
        api.acionarEmergencia.mockResolvedValue(EMERGENCIA);
      });
      await digitarEEnviar('socorro');
      await fireEvent.press(
        await screen.findByRole('button', { name: 'Sim, avisar meus contatos' }),
      );
      await screen.findByText(EMERGENCIA.mensagemFalada);
      expect(falar).toHaveBeenCalledWith(EMERGENCIA.mensagemFalada);
    });
  });

  describe('parar de falar', () => {
    async function comRespostaNaTela() {
      await montarComResposta(zeladoria);
      await digitarEEnviar('calçada quebrada');
      await screen.findByText(zeladoria.mensagemFalada);
      (pararDeFalar as jest.Mock).mockClear();
    }

    it('"Não, cancelar" para a leitura', async () => {
      await comRespostaNaTela();
      await fireEvent.press(screen.getByRole('button', { name: 'Não, cancelar' }));
      expect(pararDeFalar).toHaveBeenCalled();
    });

    it('confirmar para a leitura antes de agir', async () => {
      await comRespostaNaTela();
      await fireEvent.press(screen.getByRole('button', { name: 'Sim, abrir o formulário' }));
      expect(pararDeFalar).toHaveBeenCalled();
    });

    it('mexer no texto para a leitura', async () => {
      await comRespostaNaTela();
      await fireEvent.changeText(screen.getByLabelText('O que você precisa?'), 'outra coisa');
      expect(pararDeFalar).toHaveBeenCalled();
    });

    it('sair da tela para a leitura', async () => {
      await comRespostaNaTela();
      await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
      await waitFor(() => expect(screen.getByText('Início de mentira')).toBeOnTheScreen());
      expect(pararDeFalar).toHaveBeenCalled();
    });
  });
});
