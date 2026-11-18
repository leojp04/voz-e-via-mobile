import { renderHook } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';

import { anunciar, useAnunciar } from './anunciar';

// No iOS o VoiceOver NÃO lê sozinho uma mensagem que aparece na tela (accessibilityLiveRegion só
// existe no Android). Quem avisa é AccessibilityInfo.announceForAccessibility.
//
// O ambiente de teste do React Native já troca announceForAccessibility por uma função simulada
// (jest.fn). Usa-se ela direto e limpa-se a cada teste, senão as chamadas se acumulam entre testes.
const espiao = AccessibilityInfo.announceForAccessibility as jest.Mock;

afterEach(() => {
  jest.restoreAllMocks();
});

describe('anunciar', () => {
  beforeEach(() => {
    espiao.mockClear();
  });

  it('no iOS pede ao VoiceOver que leia o texto', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    anunciar('Informe o seu e-mail.');
    expect(espiao).toHaveBeenCalledWith('Informe o seu e-mail.');
  });

  it('no Android não anuncia (o accessibilityLiveRegion já avisa; senão a fala se repete)', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    anunciar('Informe o seu e-mail.');
    expect(espiao).not.toHaveBeenCalled();
  });

  it('não anuncia texto vazio', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    anunciar('   ');
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
    espiao.mockClear();
  });

  it('anuncia quando a mensagem aparece', async () => {
    const { rerender } = await montarGancho(null);
    expect(espiao).not.toHaveBeenCalled();

    await rerender({ texto: 'Sem conexão com a internet.' });
    expect(espiao).toHaveBeenCalledTimes(1);
    expect(espiao).toHaveBeenCalledWith('Sem conexão com a internet.');
  });

  it('anuncia na hora se a tela já nasce com a mensagem', async () => {
    await montarGancho('Algo deu errado.');
    expect(espiao).toHaveBeenCalledWith('Algo deu errado.');
  });

  it('não repete o anúncio quando a tela só redesenha com a mesma mensagem', async () => {
    const { rerender } = await montarGancho('Erro A');
    await rerender({ texto: 'Erro A' });
    await rerender({ texto: 'Erro A' });
    expect(espiao).toHaveBeenCalledTimes(1);
  });

  it('anuncia de novo quando a mensagem muda', async () => {
    const { rerender } = await montarGancho('Erro A');
    await rerender({ texto: 'Erro B' });
    expect(espiao).toHaveBeenNthCalledWith(1, 'Erro A');
    expect(espiao).toHaveBeenNthCalledWith(2, 'Erro B');
  });

  it('não anuncia quando a mensagem some (null ou vazia)', async () => {
    const { rerender } = await montarGancho('Erro A');
    await rerender({ texto: null });
    await rerender({ texto: undefined });
    await rerender({ texto: '' });
    expect(espiao).toHaveBeenCalledTimes(1);
  });
});
