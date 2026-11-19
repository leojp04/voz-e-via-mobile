// Auditoria de acessibilidade das telas que a primeira auditoria (acessibilidade-telas.test.tsx)
// nao cobre: login, cadastro, inicio, assistente por voz, contatos (lista e formulario),
// privacidade e sobre. Usa o mesmo "robo" (test-utils/auditar-acessibilidade): toda tela e
// montada de verdade e a arvore de elementos e percorrida procurando o que o VoiceOver/TalkBack
// e a letra grande quebram.

import { fireEvent, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';

import { falar, pararDeFalar } from '../services/voz/falar';
import { useEscutaDeVoz } from '../services/voz/use-escuta-de-voz';
import type {
  AtendimentoProximo,
  Contato,
  EntidadesDaFala,
  Pagina,
  PerfilEmergencia,
  RespostaAssistente,
  ResultadoVerificacao,
} from '../services/api/types';
import { auditar } from '../test-utils/auditar-acessibilidade';
import {
  criarArmazenamentoEmMemoria,
  criarAssistenteApiMock,
  criarAuthApiMock,
  criarContatosApiMock,
  criarPerfisApiMock,
  montarTela,
  sessaoDeTeste,
} from '../test-utils/montar-tela';
import { TelaAssistente } from './TelaAssistente';
import { TelaCadastro } from './TelaCadastro';
import { TelaContatos } from './TelaContatos';
import { TelaFormularioContato } from './TelaFormularioContato';
import { TelaInicio } from './TelaInicio';
import { TelaLogin } from './TelaLogin';
import { TelaPrivacidade } from './TelaPrivacidade';
import { TelaSobre } from './TelaSobre';

// O Ionicons tenta carregar um arquivo de fonte (que nao existe no Jest); o icone e decorativo.
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.2.3', extra: { commitHash: 'abc1234' } } },
}));
// Discador, mapa, GPS e voz sao do aparelho: aqui so interessa o que a tela desenha.
jest.mock('../utils/ligar-para');
jest.mock('../utils/url-do-mapa');
jest.mock('../services/aparelho/localizacao');
jest.mock('../services/voz/falar');
jest.mock('../services/voz/use-escuta-de-voz');

beforeEach(() => {
  jest.clearAllMocks();
  (falar as jest.Mock).mockResolvedValue(undefined);
  (pararDeFalar as jest.Mock).mockResolvedValue(undefined);
  (useEscutaDeVoz as jest.Mock).mockReturnValue({
    disponivel: true,
    ouvindo: false,
    precisaAviso: false,
    erro: null,
    alternar: jest.fn(),
    aceitarAviso: jest.fn(),
    recusarAviso: jest.fn(),
  });
});

const raiz = () => screen.root as unknown as ReactTestInstance;

function InicioFalso() {
  return <Text>Início de mentira</Text>;
}

const PERFIL: PerfilEmergencia = {
  id: 5,
  mobilidade: 'NAO_INFORMADO',
  condicoesSaude: null,
  medicamentos: null,
  observacoes: null,
};

const CONTATO: Contato = {
  id: 3,
  nome: 'Marina Souza',
  parentesco: 'filha',
  telefone: '+5511988887777',
  prioridade: 2,
};

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

const FARMACIA: AtendimentoProximo = {
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

const VERIFICACAO: ResultadoVerificacao = {
  classificacao: 'PROVAVEL_GOLPE',
  tipoGolpe: 'FALSO_PARENTE',
  sinais: ['Pede dinheiro com urgência'],
  orientacao: 'Não faça o Pix. Ligue para a pessoa no número que você já tem.',
  canalOficial: null,
  mensagemFalada: 'Isso parece golpe.',
  fontes: [],
};

function pagina(itens: Contato[]): Pagina<Contato> {
  return { itens, pagina: 1, tamanho: 10, total: itens.length };
}

describe('acessibilidade: entrada e início', () => {
  it('Login', async () => {
    await montarTela(TelaLogin, { auth: criarAuthApiMock() });
    await screen.findByRole('button', { name: /Entrar/ });
    expect(auditar(raiz())).toEqual([]);
  });

  it('Cadastro', async () => {
    await montarTela(TelaCadastro, { auth: criarAuthApiMock() });
    await screen.findByRole('button', { name: /Criar|Cadastrar/ });
    expect(auditar(raiz())).toEqual([]);
  });

  it('Início', async () => {
    await montarTela(TelaInicio, {
      auth: criarAuthApiMock(),
      armazenamento: criarArmazenamentoEmMemoria(sessaoDeTeste),
    });
    await screen.findByRole('button', { name: 'Pedir ajuda' });
    expect(auditar(raiz())).toEqual([]);
  });
});

describe('acessibilidade: assistente por voz', () => {
  async function montarAssistente(
    configurar: (api: ReturnType<typeof criarAssistenteApiMock>) => void,
  ) {
    const assistente = criarAssistenteApiMock();
    configurar(assistente);
    await montarTela(InicioFalso, {
      auth: criarAuthApiMock(),
      assistente,
      armazenamento: criarArmazenamentoEmMemoria(sessaoDeTeste),
      rotas: { assistente: TelaAssistente },
      url: '/assistente',
    });
    await screen.findByRole('header', { name: 'Assistente' });
  }

  async function enviar(texto: string) {
    await fireEvent.changeText(screen.getByLabelText('O que você precisa?'), texto);
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar ao assistente' }));
  }

  it('Assistente (estado inicial)', async () => {
    await montarAssistente(() => {});
    expect(auditar(raiz())).toEqual([]);
  });

  it('Assistente (pedido de socorro esperando confirmação)', async () => {
    await montarAssistente((api) =>
      api.interpretar.mockResolvedValue(
        resposta({
          intencao: 'SOCORRO',
          urgencia: 'CRITICA',
          mensagemFalada: 'Você precisa de ajuda? Posso avisar seus contatos agora.',
        }),
      ),
    );
    await enviar('preciso de ajuda');
    await screen.findByRole('button', { name: 'Sim, avisar meus contatos' });
    expect(auditar(raiz())).toEqual([]);
  });

  it('Assistente (lista de atendimentos)', async () => {
    await montarAssistente((api) =>
      api.interpretar.mockResolvedValue(
        resposta({
          intencao: 'BUSCAR_ATENDIMENTO',
          entidades: { ...SEM_ENTIDADES, tipoAtendimento: 'FARMACIA' },
          mensagemFalada: 'Achei uma farmácia a 350 metros.',
          atendimentos: {
            tipo: 'FARMACIA',
            atendimentos: [FARMACIA],
            semAcessivelNoRaio: false,
            mensagemFalada: 'Achei uma farmácia a 350 metros.',
            orientacaoEmergencia: null,
            telefoneEmergencia: null,
            observacao: null,
            creditoDados: '© Colaboradores do OpenStreetMap (ODbL)',
          },
        }),
      ),
    );
    await enviar('farmácia perto de mim');
    await screen.findByText('Farmácia Exemplo');
    expect(auditar(raiz())).toEqual([]);
  });

  it('Assistente (parecer da verificação de golpe)', async () => {
    await montarAssistente((api) => {
      api.interpretar.mockResolvedValue(
        resposta({
          intencao: 'VERIFICAR_INFORMACAO',
          mensagemFalada: 'Vou checar essa mensagem para você.',
        }),
      );
      api.verificarMensagem.mockResolvedValue(VERIFICACAO);
    });
    await enviar('mãe, troquei de número, faz um pix');
    await fireEvent.press(await screen.findByRole('button', { name: 'Sim, verificar' }));
    await screen.findByText('Provável golpe');
    expect(auditar(raiz())).toEqual([]);
  });
});

describe('acessibilidade: contatos de emergência', () => {
  async function montarContatos(perfil: PerfilEmergencia | null, itens: Contato[]) {
    const contatos = criarContatosApiMock();
    contatos.listar.mockResolvedValue(pagina(itens));
    const perfis = criarPerfisApiMock();
    perfis.meu.mockResolvedValue(perfil);
    await montarTela(InicioFalso, {
      auth: criarAuthApiMock(),
      contatos,
      perfis,
      rotas: { contatos: TelaContatos },
      url: '/contatos',
    });
  }

  it('Contatos (com lista)', async () => {
    await montarContatos(PERFIL, [CONTATO]);
    await screen.findByText('Marina Souza');
    expect(auditar(raiz())).toEqual([]);
  });

  it('Contatos (sem perfil)', async () => {
    await montarContatos(null, []);
    await screen.findByRole('button', { name: 'Criar meu perfil de emergência' });
    expect(auditar(raiz())).toEqual([]);
  });

  it('Novo contato', async () => {
    await montarTela(InicioFalso, {
      auth: criarAuthApiMock(),
      contatos: criarContatosApiMock(),
      rotas: { 'contatos/novo': TelaFormularioContato },
      url: '/contatos/novo',
    });
    await screen.findByRole('header', { name: 'Novo contato' });
    expect(auditar(raiz())).toEqual([]);
  });

  it('Editar contato', async () => {
    const contatos = criarContatosApiMock();
    contatos.obter.mockResolvedValue(CONTATO);
    await montarTela(InicioFalso, {
      auth: criarAuthApiMock(),
      contatos,
      rotas: { 'contatos/[id]': TelaFormularioContato },
      url: '/contatos/3',
    });
    await screen.findByDisplayValue('Marina Souza');
    expect(auditar(raiz())).toEqual([]);
  });
});

describe('acessibilidade: privacidade e sobre', () => {
  it('Privacidade (com sessão, mostra excluir conta)', async () => {
    await montarTela(TelaPrivacidade, {
      auth: criarAuthApiMock(),
      armazenamento: criarArmazenamentoEmMemoria(sessaoDeTeste),
    });
    await screen.findByRole('button', { name: /Excluir/ });
    expect(auditar(raiz())).toEqual([]);
  });

  it('Sobre', async () => {
    await montarTela(TelaSobre, { auth: criarAuthApiMock() });
    await screen.findByRole('header', { name: 'Sobre o app' });
    expect(auditar(raiz())).toEqual([]);
  });
});
