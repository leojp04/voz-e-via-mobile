import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Alert, Text } from 'react-native';

import { obterLocalizacao } from '../services/aparelho/localizacao';
import { ErroApi } from '../services/api/erro';
import type { Contato, Pagina, RespostaAssistente } from '../services/api/types';
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
