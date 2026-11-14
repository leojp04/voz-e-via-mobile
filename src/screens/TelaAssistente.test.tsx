import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Alert, Text } from 'react-native';

import { ErroApi } from '../services/api/erro';
import type { RespostaAssistente } from '../services/api/types';
import {
  criarArmazenamentoEmMemoria,
  criarAssistenteApiMock,
  criarAuthApiMock,
  montarTela,
  sessaoDeTeste,
} from '../test-utils/montar-tela';
import { TelaAssistente } from './TelaAssistente';

// O Ionicons tenta carregar um arquivo de fonte (que nao existe no Jest); o icone e decorativo.
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

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

function InicioFalso() {
  return <Text>Início de mentira</Text>;
}

async function montar(
  configurar: (api: ReturnType<typeof criarAssistenteApiMock>) => void = () => {},
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

  it('"Sim, confirmar" ainda não executa nada e avisa "Em breve"', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await montar((api) => api.interpretar.mockResolvedValue(reporte));
    await screen.findByRole('header', { name: 'Assistente' });
    await digitarEEnviar('calçada quebrada');
    await screen.findByText(reporte.respostaFalada);

    await fireEvent.press(screen.getByRole('button', { name: 'Sim, confirmar' }));

    expect(alerta).toHaveBeenCalledWith('Em breve', 'Esta ação ainda não está disponível.');
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
