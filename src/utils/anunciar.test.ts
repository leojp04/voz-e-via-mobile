import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';

import { anunciar, ATRASO_DO_ANUNCIO_MS, useAnunciar } from './anunciar';

// No iOS o VoiceOver NÃO lê sozinho uma mensagem que aparece na tela (accessibilityLiveRegion só
// existe no Android). Quem avisa é AccessibilityInfo.announceForAccessibilityWithOptions.
//
// Dois cuidados, vistos no iPhone: (1) ao ativar um botão o VoiceOver está falando o nome dele e
// um aviso disparado nesse instante se perdia; por isso o aviso espera um pouco; (2) ele entra na
// FILA (queue: true) atrás da fala em andamento, em vez de cortá-la ou ser cortado.
//
// O ambiente de teste do React Native já troca esta API por uma função simulada (jest.fn). Usa-se
// ela direto e limpa-se a cada teste, senão as chamadas se acumulam entre testes.
const espiao = AccessibilityInfo.announceForAccessibilityWithOptions as jest.Mock;

const passar = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

beforeEach(() => {
  jest.useFakeTimers();
  espiao.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('anunciar', () => {
  it('no iOS enfileira o texto para o VoiceOver ler, depois de um pequeno atraso', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    anunciar('Informe o seu e-mail.');

    expect(espiao).not.toHaveBeenCalled();
    await passar(ATRASO_DO_ANUNCIO_MS);
    expect(espiao).toHaveBeenCalledTimes(1);
    expect(espiao).toHaveBeenCalledWith('Informe o seu e-mail.', { queue: true });
  });

  it('no Android não anuncia (o accessibilityLiveRegion já avisa; senão a fala se repete)', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    anunciar('Informe o seu e-mail.');
    await passar(ATRASO_DO_ANUNCIO_MS * 2);
    expect(espiao).not.toHaveBeenCalled();
  });

  it('não anuncia texto vazio', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    anunciar('   ');
    await passar(ATRASO_DO_ANUNCIO_MS * 2);
    expect(espiao).not.toHaveBeenCalled();
  });

  it('devolve uma função que cancela o aviso ainda não dito', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const cancelar = anunciar('Erro que sumiu antes de ser lido.');
    cancelar();
    await passar(ATRASO_DO_ANUNCIO_MS * 2);
    expect(espiao).not.toHaveBeenCalled();
  });
});

interface Propriedades {
  texto: string | null | undefined;
}

// Na versão 14 da biblioteca de testes, renderHook e rerender são assíncronos (precisam de await).
function montarGancho(texto: Propriedades['texto']) {
  return renderHook((props: Propriedades) => useAnunciar(props.texto), {
    initialProps: { texto } as Propriedades,
  });
}

describe('useAnunciar', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'ios');
  });

  it('anuncia quando a mensagem aparece', async () => {
    const { rerender } = await montarGancho(null);
    await passar(ATRASO_DO_ANUNCIO_MS * 2);
    expect(espiao).not.toHaveBeenCalled();

    await rerender({ texto: 'Sem conexão com a internet.' });
    await passar(ATRASO_DO_ANUNCIO_MS);
    expect(espiao).toHaveBeenCalledTimes(1);
    expect(espiao).toHaveBeenCalledWith('Sem conexão com a internet.', { queue: true });
  });

  it('anuncia se a tela já nasce com a mensagem', async () => {
    await montarGancho('Algo deu errado.');
    await passar(ATRASO_DO_ANUNCIO_MS);
    expect(espiao).toHaveBeenCalledWith('Algo deu errado.', { queue: true });
  });

  it('não repete o anúncio quando a tela só redesenha com a mesma mensagem', async () => {
    const { rerender } = await montarGancho('Erro A');
    await rerender({ texto: 'Erro A' });
    await rerender({ texto: 'Erro A' });
    await passar(ATRASO_DO_ANUNCIO_MS * 2);
    expect(espiao).toHaveBeenCalledTimes(1);
  });

  it('anuncia de novo quando a mensagem muda', async () => {
    const { rerender } = await montarGancho('Erro A');
    await passar(ATRASO_DO_ANUNCIO_MS);
    await rerender({ texto: 'Erro B' });
    await passar(ATRASO_DO_ANUNCIO_MS);
    expect(espiao).toHaveBeenNthCalledWith(1, 'Erro A', { queue: true });
    expect(espiao).toHaveBeenNthCalledWith(2, 'Erro B', { queue: true });
  });

  it('não lê um erro que sumiu antes do atraso acabar', async () => {
    const { rerender } = await montarGancho('Erro A');
    await rerender({ texto: null });
    await passar(ATRASO_DO_ANUNCIO_MS * 2);
    expect(espiao).not.toHaveBeenCalled();
  });

  it('não anuncia quando a mensagem some (null ou vazia)', async () => {
    const { rerender } = await montarGancho('Erro A');
    await passar(ATRASO_DO_ANUNCIO_MS);
    await rerender({ texto: null });
    await rerender({ texto: undefined });
    await rerender({ texto: '' });
    await passar(ATRASO_DO_ANUNCIO_MS * 2);
    expect(espiao).toHaveBeenCalledTimes(1);
  });
});
