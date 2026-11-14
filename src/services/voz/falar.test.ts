import * as Speech from 'expo-speech';

import { falar, pararDeFalar } from './falar';

// O expo-speech e nativo (sintese de voz do aparelho), entao nos testes ele e simulado.
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

const falarNoAparelho = Speech.speak as jest.Mock;
const pararNoAparelho = Speech.stop as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  pararNoAparelho.mockResolvedValue(undefined);
});

describe('falar', () => {
  it('le o texto em portugues do Brasil', async () => {
    await falar('Ligando para a Maria.');
    expect(falarNoAparelho).toHaveBeenCalledWith('Ligando para a Maria.', { language: 'pt-BR' });
  });

  it('nao fala quando o texto esta vazio ou so tem espacos', async () => {
    await falar('');
    await falar('   ');
    expect(falarNoAparelho).not.toHaveBeenCalled();
  });

  it('corta a fala anterior antes de comecar a nova (nunca duas vozes juntas)', async () => {
    const ordem: string[] = [];
    pararNoAparelho.mockImplementation(async () => {
      ordem.push('parar');
    });
    falarNoAparelho.mockImplementation(() => {
      ordem.push('falar');
    });
    await falar('Oi');
    expect(ordem).toEqual(['parar', 'falar']);
  });

  it('se a voz do aparelho falhar, nao derruba a tela (a resposta continua escrita)', async () => {
    falarNoAparelho.mockImplementation(() => {
      throw new Error('sem motor de voz');
    });
    await expect(falar('Oi')).resolves.toBeUndefined();
  });
});

describe('pararDeFalar', () => {
  it('interrompe a fala em andamento', async () => {
    await pararDeFalar();
    expect(pararNoAparelho).toHaveBeenCalledTimes(1);
  });

  it('ignora falha ao parar', async () => {
    pararNoAparelho.mockRejectedValue(new Error('nada para parar'));
    await expect(pararDeFalar()).resolves.toBeUndefined();
  });
});
