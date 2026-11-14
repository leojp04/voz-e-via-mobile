import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Alert, Text } from 'react-native';

import { obterLocalizacao } from '../services/aparelho/localizacao';
import { ErroApi } from '../services/api/erro';
import type { Contato, Pagina, RespostaAssistente } from '../services/api/types';
import { falar, pararDeFalar } from '../services/voz/falar';
import { useEscutaDeVoz, type EscutaDeVoz } from '../services/voz/use-escuta-de-voz';
import {
  criarArmazenamentoEmMemoria,
  criarAssistenteApiMock,
  criarAuthApiMock,
  criarContatosApiMock,
  montarTela,
  sessaoDeTeste,
} from '../test-utils/montar-tela';
import { ligarPara } from '../utils/ligar-para';
import { abrirBuscaNoMapa } from '../utils/url-do-mapa';
import { TelaAssistente } from './TelaAssistente';

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

const reporte: RespostaAssistente = {
  intencao: 'REPORTAR_PROBLEMA',
  parametros: { categoria: 'CALCADA', urgencia: 'ALTA', descricao: 'Calçada quebrada' },
  respostaFalada: 'Entendi. Vou registrar uma calçada quebrada. Posso confirmar?',
  fontes: [],
  precisaConfirmacao: true,
};

const direito: RespostaAssistente = {
  intencao: 'DUVIDA_DIREITO',
  parametros: {},
  respostaFalada: 'Pessoas com deficiência têm direito ao atendimento prioritário.',
  fontes: ['Lei Brasileira de Inclusão (Lei 13.146/2015)'],
  precisaConfirmacao: false,
};

const ligar: RespostaAssistente = {
  intencao: 'LIGAR_CONTATO',
  parametros: { apelido: 'filha' },
  respostaFalada: 'Quer ligar para filha?',
  fontes: [],
  precisaConfirmacao: true,
};

const local: RespostaAssistente = {
  intencao: 'LOCAL_PROXIMO',
  parametros: { busca: 'farmácia' },
  respostaFalada: 'Vou abrir o mapa com farmácia perto de você.',
  fontes: [],
  precisaConfirmacao: true,
};

// A API pode mandar precisaConfirmacao=false numa intencao que age; a tela ainda pede um toque.
const consultar: RespostaAssistente = {
  intencao: 'CONSULTAR_REPORTES',
  parametros: {},
  respostaFalada: 'Vou abrir os seus reportes.',
  fontes: [],
  precisaConfirmacao: false,
};

const emergencia: RespostaAssistente = {
  intencao: 'EMERGENCIA',
  parametros: {},
  respostaFalada: 'Você precisa de ajuda? Posso avisar seus cuidadores agora.',
  fontes: [],
  precisaConfirmacao: true,
};

const AVISO_EMERGENCIA =
  'O aviso aos cuidadores ainda não está disponível neste aplicativo. Em emergência, ligue para o SAMU: 192.';

const paginaComFilha: Pagina<Contato> = {
  itens: [{ id: 1, nome: 'Ana', apelido: 'Filha', telefone: '11933334444', prioridade: 1 }],
  pagina: 1,
  tamanho: 50,
  total: 1,
};

function InicioFalso() {
  return <Text>Início de mentira</Text>;
}

function NovoReporteFalso() {
  return <Text>Novo reporte de mentira</Text>;
}

function ReportesFalso() {
  return <Text>Reportes de mentira</Text>;
}

async function montar(
  configurar: (api: ReturnType<typeof criarAssistenteApiMock>) => void = () => {},
  configurarContatos: (api: ReturnType<typeof criarContatosApiMock>) => void = () => {},
) {
  const assistente = criarAssistenteApiMock();
  configurar(assistente);
  const contatos = criarContatosApiMock();
  configurarContatos(contatos);
  await montarTela(InicioFalso, {
    auth: criarAuthApiMock(),
    assistente,
    contatos,
    armazenamento: criarArmazenamentoEmMemoria(sessaoDeTeste),
    rotas: {
      assistente: TelaAssistente,
      'reportes/novo': NovoReporteFalso,
      'reportes/index': ReportesFalso,
    },
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

  it('envia o texto sem espaços nas pontas e mostra a resposta falada', async () => {
    const assistente = await montar((api) => api.interpretar.mockResolvedValue(reporte));
    await screen.findByRole('header', { name: 'Assistente' });

    await digitarEEnviar('  a calçada está quebrada  ');

    expect(await screen.findByText(reporte.respostaFalada)).toBeOnTheScreen();
    expect(assistente.interpretar).toHaveBeenCalledWith({ texto: 'a calçada está quebrada' });
  });

  it('quando precisa de confirmação, mostra "Sim, confirmar" e "Não, cancelar"', async () => {
    await montar((api) => api.interpretar.mockResolvedValue(reporte));
    await screen.findByRole('header', { name: 'Assistente' });

    await digitarEEnviar('calçada quebrada');

    expect(await screen.findByRole('button', { name: 'Sim, confirmar' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Não, cancelar' })).toBeOnTheScreen();
  });

  it('quando não precisa de confirmação, não mostra os botões de confirmar', async () => {
    await montar((api) => api.interpretar.mockResolvedValue(direito));
    await screen.findByRole('header', { name: 'Assistente' });

    await digitarEEnviar('tenho direito a passe livre?');

    expect(await screen.findByText(direito.respostaFalada)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Sim, confirmar' })).not.toBeOnTheScreen();
  });

  it('mostra as fontes citadas pela resposta', async () => {
    await montar((api) => api.interpretar.mockResolvedValue(direito));
    await screen.findByRole('header', { name: 'Assistente' });

    await digitarEEnviar('tenho direito a passe livre?');

    expect(
      await screen.findByText('Fonte: Lei Brasileira de Inclusão (Lei 13.146/2015)'),
    ).toBeOnTheScreen();
  });

  it('"Não, cancelar" some com a sugestão, e nada é executado', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await montar((api) => api.interpretar.mockResolvedValue(reporte));
    await screen.findByRole('header', { name: 'Assistente' });
    await digitarEEnviar('calçada quebrada');
    await screen.findByText(reporte.respostaFalada);

    await fireEvent.press(screen.getByRole('button', { name: 'Não, cancelar' }));

    expect(screen.queryByText(reporte.respostaFalada)).not.toBeOnTheScreen();
    expect(alerta).not.toHaveBeenCalled();
  });

  it('nada é executado antes do toque em "Sim, confirmar"', async () => {
    await montar((api) => api.interpretar.mockResolvedValue(ligar));
    await screen.findByRole('header', { name: 'Assistente' });

    await digitarEEnviar('ligar para minha filha');
    await screen.findByText(ligar.respostaFalada);

    expect(ligarPara).not.toHaveBeenCalled();
    expect(screen).toHavePathname('/assistente');
  });

  it('"Sim, confirmar" em LIGAR_CONTATO abre o discador com o telefone do apelido', async () => {
    await montar(
      (api) => api.interpretar.mockResolvedValue(ligar),
      (contatos) => contatos.listar.mockResolvedValue(paginaComFilha),
    );
    await screen.findByRole('header', { name: 'Assistente' });
    await digitarEEnviar('ligar para minha filha');
    await screen.findByText(ligar.respostaFalada);

    await fireEvent.press(screen.getByRole('button', { name: 'Sim, confirmar' }));

    await waitFor(() => expect(ligarPara).toHaveBeenCalledWith('11933334444'));
    // A sugestao some: nao da para confirmar a mesma acao duas vezes sem querer.
    expect(screen.queryByRole('button', { name: 'Sim, confirmar' })).not.toBeOnTheScreen();
  });

  it('"Sim, confirmar" em LOCAL_PROXIMO abre o mapa perto de onde a pessoa está', async () => {
    jest.mocked(obterLocalizacao).mockResolvedValue({ latitude: -23.5, longitude: -46.6 });
    await montar((api) => api.interpretar.mockResolvedValue(local));
    await screen.findByRole('header', { name: 'Assistente' });
    await digitarEEnviar('farmácia perto');
    await screen.findByText(local.respostaFalada);

    await fireEvent.press(screen.getByRole('button', { name: 'Sim, confirmar' }));

    await waitFor(() =>
      expect(abrirBuscaNoMapa).toHaveBeenCalledWith('farmácia', {
        latitude: -23.5,
        longitude: -46.6,
      }),
    );
  });

  it('"Sim, confirmar" em REPORTAR_PROBLEMA abre o formulário já preenchido', async () => {
    await montar((api) => api.interpretar.mockResolvedValue(reporte));
    await screen.findByRole('header', { name: 'Assistente' });
    await digitarEEnviar('calçada quebrada');
    await screen.findByText(reporte.respostaFalada);

    await fireEvent.press(screen.getByRole('button', { name: 'Sim, confirmar' }));

    await waitFor(() => expect(screen).toHavePathname('/reportes/novo'));
    expect(screen).toHaveSearchParams({
      categoria: 'CALCADA',
      urgencia: 'ALTA',
      descricao: 'Calçada quebrada',
    });
  });

  it('CONSULTAR_REPORTES, mesmo sem confirmação da API, espera um toque antes de abrir', async () => {
    await montar((api) => api.interpretar.mockResolvedValue(consultar));
    await screen.findByRole('header', { name: 'Assistente' });
    await digitarEEnviar('meus reportes');
    await screen.findByText(consultar.respostaFalada);
    expect(screen).toHavePathname('/assistente');

    await fireEvent.press(await screen.findByRole('button', { name: 'Sim, confirmar' }));

    await waitFor(() => expect(screen).toHavePathname('/reportes'));
  });

  it('quando a ação não pode ser feita, mostra o aviso e some com a sugestão', async () => {
    await montar((api) => api.interpretar.mockResolvedValue(emergencia));
    await screen.findByRole('header', { name: 'Assistente' });
    await digitarEEnviar('socorro');
    await screen.findByText(emergencia.respostaFalada);

    await fireEvent.press(screen.getByRole('button', { name: 'Sim, confirmar' }));

    expect(await screen.findByText(AVISO_EMERGENCIA)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Sim, confirmar' })).not.toBeOnTheScreen();
  });

  it('mexer no texto apaga o aviso da ação anterior', async () => {
    await montar((api) => api.interpretar.mockResolvedValue(emergencia));
    await screen.findByRole('header', { name: 'Assistente' });
    await digitarEEnviar('socorro');
    await fireEvent.press(await screen.findByRole('button', { name: 'Sim, confirmar' }));
    await screen.findByText(AVISO_EMERGENCIA);

    await fireEvent.changeText(screen.getByLabelText('O que você precisa?'), 'outra coisa');

    expect(screen.queryByText(AVISO_EMERGENCIA)).not.toBeOnTheScreen();
  });

  it('mexer no texto apaga a sugestão antiga (não dá para confirmar o que não é mais o texto)', async () => {
    await montar((api) => api.interpretar.mockResolvedValue(reporte));
    await screen.findByRole('header', { name: 'Assistente' });
    await digitarEEnviar('calçada quebrada');
    await screen.findByText(reporte.respostaFalada);

    await fireEvent.changeText(screen.getByLabelText('O que você precisa?'), 'socorro');

    expect(screen.queryByText(reporte.respostaFalada)).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Sim, confirmar' })).not.toBeOnTheScreen();
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
    expect(screen.queryByRole('button', { name: 'Sim, confirmar' })).not.toBeOnTheScreen();
  });

  it('um novo envio com sucesso apaga o erro anterior', async () => {
    await montar((api) =>
      api.interpretar
        .mockRejectedValueOnce(new ErroApi(0, 'Network request failed'))
        .mockResolvedValueOnce(direito),
    );
    await screen.findByRole('header', { name: 'Assistente' });
    await digitarEEnviar('direito');
    await screen.findByText('Sem conexão. Nada foi feito. Tente de novo.');

    await fireEvent.press(screen.getByRole('button', { name: 'Enviar ao assistente' }));

    expect(await screen.findByText(direito.respostaFalada)).toBeOnTheScreen();
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
    resolver(reporte);

    await screen.findByText(reporte.respostaFalada);
    expect(assistente.interpretar).toHaveBeenCalledTimes(1);
  });

  it('"Voltar" leva para o Início', async () => {
    await montar();
    await screen.findByRole('header', { name: 'Assistente' });

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    await waitFor(() => expect(screen.getByText('Início de mentira')).toBeOnTheScreen());
  });
});

describe('TelaAssistente: voz', () => {
  const MIC = 'Falar com o assistente por voz';
  const LER_SEMPRE = 'Ler sempre a resposta em voz alta';

  async function montarComResposta(resposta: RespostaAssistente) {
    const assistente = await montar((api) => api.interpretar.mockResolvedValue(resposta));
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
      await aparelhoOuviu('ligar para a filha');
      expect(screen.getByLabelText('O que você precisa?')).toHaveProp(
        'value',
        'ligar para a filha',
      );
      expect(assistente.interpretar).not.toHaveBeenCalled();
    });

    it('acompanha o texto parcial enquanto a pessoa fala', async () => {
      await montar();
      await screen.findByRole('header', { name: 'Assistente' });
      await aparelhoOuviu('ligar', false);
      expect(screen.getByLabelText('O que você precisa?')).toHaveProp('value', 'ligar');
      await aparelhoOuviu('ligar para a filha', true);
      expect(screen.getByLabelText('O que você precisa?')).toHaveProp(
        'value',
        'ligar para a filha',
      );
    });

    it('apaga a sugestão antiga, que era de outro texto', async () => {
      await montarComResposta(reporte);
      await digitarEEnviar('calçada quebrada');
      await screen.findByText(reporte.respostaFalada);
      await aparelhoOuviu('outra coisa');
      expect(screen.queryByText(reporte.respostaFalada)).not.toBeOnTheScreen();
    });

    it('o texto falado pode ser enviado pelo botão Enviar', async () => {
      const assistente = await montarComResposta(direito);
      await aparelhoOuviu('quais são meus direitos');
      await fireEvent.press(screen.getByRole('button', { name: 'Enviar ao assistente' }));
      await screen.findByText(direito.respostaFalada);
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
      await montarComResposta(direito);
      await digitarEEnviar('meus direitos');
      await screen.findByText(direito.respostaFalada);
      expect(falar).toHaveBeenCalledWith(direito.respostaFalada);
    });

    it('desligado: pergunta digitada não é lida', async () => {
      await montarComResposta(direito);
      await fireEvent.press(screen.getByRole('checkbox', { name: LER_SEMPRE }));
      await digitarEEnviar('meus direitos');
      await screen.findByText(direito.respostaFalada);
      expect(falar).not.toHaveBeenCalled();
    });

    it('desligado: pergunta feita por voz é lida', async () => {
      await montarComResposta(direito);
      await fireEvent.press(screen.getByRole('checkbox', { name: LER_SEMPRE }));
      await aparelhoOuviu('meus direitos');
      await fireEvent.press(screen.getByRole('button', { name: 'Enviar ao assistente' }));
      await screen.findByText(direito.respostaFalada);
      expect(falar).toHaveBeenCalledWith(direito.respostaFalada);
    });

    it('desligado: depois de falar, se a pessoa digitar por cima, volta a não ler', async () => {
      await montarComResposta(direito);
      await fireEvent.press(screen.getByRole('checkbox', { name: LER_SEMPRE }));
      await aparelhoOuviu('meus direitos');
      await digitarEEnviar('meus direitos de novo');
      await screen.findByText(direito.respostaFalada);
      expect(falar).not.toHaveBeenCalled();
    });

    it('"Ouvir de novo" lê a resposta outra vez, com o interruptor desligado também', async () => {
      await montarComResposta(direito);
      await fireEvent.press(screen.getByRole('checkbox', { name: LER_SEMPRE }));
      await digitarEEnviar('meus direitos');
      await screen.findByText(direito.respostaFalada);
      await fireEvent.press(screen.getByRole('button', { name: 'Ouvir a resposta de novo' }));
      expect(falar).toHaveBeenCalledWith(direito.respostaFalada);
    });

    it('não mostra "Ouvir de novo" quando ainda não há resposta', async () => {
      await montar();
      await screen.findByRole('header', { name: 'Assistente' });
      expect(
        screen.queryByRole('button', { name: 'Ouvir a resposta de novo' }),
      ).not.toBeOnTheScreen();
    });
  });

  describe('parar de falar', () => {
    async function comRespostaNaTela() {
      await montarComResposta(reporte);
      await digitarEEnviar('calçada quebrada');
      await screen.findByText(reporte.respostaFalada);
      (pararDeFalar as jest.Mock).mockClear();
    }

    it('"Não, cancelar" para a leitura', async () => {
      await comRespostaNaTela();
      await fireEvent.press(screen.getByRole('button', { name: 'Não, cancelar' }));
      expect(pararDeFalar).toHaveBeenCalled();
    });

    it('"Sim, confirmar" para a leitura antes de agir', async () => {
      await comRespostaNaTela();
      await fireEvent.press(screen.getByRole('button', { name: 'Sim, confirmar' }));
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
