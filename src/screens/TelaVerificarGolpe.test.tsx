import { fireEvent, screen } from 'expo-router/testing-library';
import type { ReactTestInstance } from 'react-test-renderer';

import { ErroApi } from '../services/api/erro';
import type { RespostaAssistente, ResultadoVerificacao } from '../services/api/types';
import { auditar } from '../test-utils/auditar-acessibilidade';
import {
  criarArmazenamentoEmMemoria,
  criarAssistenteApiMock,
  criarAuthApiMock,
  montarTela,
  sessaoDeTeste,
} from '../test-utils/montar-tela';
import { TelaVerificarGolpe } from './TelaVerificarGolpe';

// O Ionicons tenta carregar um arquivo de fonte (que nao existe no Jest); o icone e decorativo.
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../utils/ligar-para');

const raiz = () => screen.root as unknown as ReactTestInstance;

const PARECER: ResultadoVerificacao = {
  classificacao: 'PROVAVEL_GOLPE',
  tipoGolpe: 'FALSO_BENEFICIO',
  sinais: ['Pede senha'],
  orientacao: 'Não clique no link. Confira pelo Meu INSS ou pela Central 135.',
  canalOficial: 'Central 135',
  mensagemFalada: 'Isso parece golpe.',
  fontes: [],
};

const AJUDA_DE_QUEM_CAIU: RespostaAssistente = {
  intencao: 'TIRAR_DUVIDA',
  urgencia: 'ALTA',
  entidades: {
    tipoAtendimento: 'DELEGACIA',
    exigeAcessibilidade: null,
    problemaRua: null,
    impedeCadeirante: null,
    referenciaLocal: null,
  },
  mensagemFalada: 'Ligue agora para o seu banco e conteste o Pix pelo MED.',
  confianca: 0.9,
  analisadoPor: 'IA_E_REGRAS',
  atendimentos: null,
  orientacao: {
    titulo: 'Caí em um golpe: o que fazer agora',
    resumo: 'Ligue agora para o seu banco e conteste o Pix pelo MED.',
    passos: ['Ligue já para o banco pelo número que está atrás do cartão.'],
    link: 'https://www.bcb.gov.br/estabilidadefinanceira/pix',
    telefone: null,
    orgao: 'Banco Central do Brasil',
    localPresencial: 'DELEGACIA',
    sobreGolpe: true,
  },
};

async function montar(configurar?: (api: ReturnType<typeof criarAssistenteApiMock>) => void) {
  const assistente = criarAssistenteApiMock();
  configurar?.(assistente);
  await montarTela(TelaVerificarGolpe, {
    auth: criarAuthApiMock(),
    armazenamento: criarArmazenamentoEmMemoria(sessaoDeTeste),
    assistente,
  });
  await screen.findByRole('header', { name: 'É golpe?' });
  return assistente;
}

describe('TelaVerificarGolpe', () => {
  it('sem mensagem, pede para colar e não chama a API', async () => {
    const assistente = await montar();

    await fireEvent.press(screen.getByRole('button', { name: 'Verificar a mensagem' }));

    expect(
      await screen.findByText('Cole ou escreva a mensagem que você recebeu.'),
    ).toBeOnTheScreen();
    expect(assistente.verificarMensagem).not.toHaveBeenCalled();
  });

  it('confere a mensagem colada com o canal e mostra o parecer com o selo de golpe', async () => {
    const assistente = await montar((api) => api.verificarMensagem.mockResolvedValue(PARECER));

    await fireEvent.changeText(
      screen.getByLabelText('Mensagem recebida'),
      'INSS: seu benefício será bloqueado, clique no link',
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'SMS' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Verificar a mensagem' }));

    expect(await screen.findByText('Provável golpe')).toBeOnTheScreen();
    expect(screen.getByText('Verificação de golpe')).toBeOnTheScreen();
    expect(assistente.verificarMensagem).toHaveBeenCalledWith({
      texto: 'INSS: seu benefício será bloqueado, clique no link',
      canal: 'SMS',
    });
  });

  it('"Já caí num golpe" mostra o que fazer agora, com o selo de ajuda contra golpe', async () => {
    const assistente = await montar((api) => api.interpretar.mockResolvedValue(AJUDA_DE_QUEM_CAIU));

    await fireEvent.press(
      screen.getByRole('button', { name: 'Já caí num golpe: o que fazer agora' }),
    );

    expect(await screen.findByText('Caí em um golpe: o que fazer agora')).toBeOnTheScreen();
    expect(screen.getByText('Ajuda contra golpe')).toBeOnTheScreen();
    expect(assistente.interpretar).toHaveBeenCalledWith({
      texto: 'Caí num golpe. O que eu faço agora?',
    });
    expect(assistente.verificarMensagem).not.toHaveBeenCalled();
  });

  it('falha da API diz que não foi possível verificar', async () => {
    await montar((api) => api.verificarMensagem.mockRejectedValue(new ErroApi(0, 'Sem conexão.')));

    await fireEvent.changeText(screen.getByLabelText('Mensagem recebida'), 'Ganhou um prêmio!');
    await fireEvent.press(screen.getByRole('button', { name: 'Verificar a mensagem' }));

    expect(
      await screen.findByText(
        'Não foi possível verificar agora. Verifique a internet e tente de novo.',
      ),
    ).toBeOnTheScreen();
  });

  it('passa na auditoria de acessibilidade, com o parecer na tela', async () => {
    await montar((api) => api.verificarMensagem.mockResolvedValue(PARECER));
    expect(auditar(raiz())).toEqual([]);

    await fireEvent.changeText(screen.getByLabelText('Mensagem recebida'), 'Ganhou um prêmio!');
    await fireEvent.press(screen.getByRole('button', { name: 'Verificar a mensagem' }));
    await screen.findByText('Provável golpe');
    expect(auditar(raiz())).toEqual([]);
  });
});
