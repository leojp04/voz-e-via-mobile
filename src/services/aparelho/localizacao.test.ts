import * as Location from 'expo-location';

import { ErroAparelho } from './erro-aparelho';
import { montarEndereco, obterLocalizacao } from './localizacao';

// O expo-location e nativo (GPS do aparelho), entao nos testes ele e simulado.
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

const pedirPermissao = Location.requestForegroundPermissionsAsync as jest.Mock;
const lerPosicao = Location.getCurrentPositionAsync as jest.Mock;
const converterEmEndereco = Location.reverseGeocodeAsync as jest.Mock;

const permissao = (concedida: boolean) => ({
  granted: concedida,
  canAskAgain: concedida,
  status: concedida ? 'granted' : 'denied',
});

const posicao = { coords: { latitude: -23.5505, longitude: -46.6333, accuracy: 12 } };

const enderecoDoAparelho = {
  street: 'Rua das Flores',
  streetNumber: '120',
  district: 'Centro',
  city: 'São Paulo',
  name: null,
};

async function erroDe(promessa: Promise<unknown>): Promise<ErroAparelho> {
  const erro = await promessa.then(
    () => null,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(ErroAparelho);
  return erro as ErroAparelho;
}

beforeEach(() => jest.resetAllMocks());

describe('obterLocalizacao', () => {
  it('pede permissao so enquanto o app esta em uso e le a posicao com precisao equilibrada', async () => {
    pedirPermissao.mockResolvedValue(permissao(true));
    lerPosicao.mockResolvedValue(posicao);
    converterEmEndereco.mockResolvedValue([enderecoDoAparelho]);

    await obterLocalizacao();

    expect(pedirPermissao).toHaveBeenCalledTimes(1);
    expect(lerPosicao).toHaveBeenCalledWith({ accuracy: 3 });
  });

  it('devolve latitude, longitude e o endereco por extenso', async () => {
    pedirPermissao.mockResolvedValue(permissao(true));
    lerPosicao.mockResolvedValue(posicao);
    converterEmEndereco.mockResolvedValue([enderecoDoAparelho]);

    await expect(obterLocalizacao()).resolves.toEqual({
      latitude: -23.5505,
      longitude: -46.6333,
      endereco: 'Rua das Flores, 120 - Centro, São Paulo',
    });
    expect(converterEmEndereco).toHaveBeenCalledWith({ latitude: -23.5505, longitude: -46.6333 });
  });

  it('permissao negada: nao le o GPS e explica como resolver', async () => {
    pedirPermissao.mockResolvedValue(permissao(false));

    const erro = await erroDe(obterLocalizacao());

    expect(erro.codigo).toBe('PERMISSAO_NEGADA');
    expect(erro.message).toBe(
      'Para usar sua localização, permita o acesso nas configurações do aparelho.',
    );
    expect(lerPosicao).not.toHaveBeenCalled();
  });

  it('GPS desligado ou sem sinal: erro claro', async () => {
    pedirPermissao.mockResolvedValue(permissao(true));
    lerPosicao.mockRejectedValue(new Error('Location services are disabled'));

    const erro = await erroDe(obterLocalizacao());

    expect(erro.codigo).toBe('INDISPONIVEL');
    expect(erro.message).toBe(
      'Não foi possível obter sua localização. Verifique se o GPS está ligado e tente de novo.',
    );
  });

  // No Android o GPS pode ficar sem responder para sempre (sem sinal, emulador). Sem limite, o botao
  // ficaria "carregando" sem fim; com o limite, a pessoa recebe o erro e pode tentar de novo.
  it('GPS que nao responde: desiste em 10 segundos com o erro de indisponivel', async () => {
    jest.useFakeTimers();
    try {
      pedirPermissao.mockResolvedValue(permissao(true));
      lerPosicao.mockReturnValue(new Promise(() => {}));

      const resultado = erroDe(obterLocalizacao());
      await jest.advanceTimersByTimeAsync(9_999);
      expect(converterEmEndereco).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1);

      const erro = await resultado;
      expect(erro.codigo).toBe('INDISPONIVEL');
    } finally {
      jest.useRealTimers();
    }
  });

  // O endereco e um extra: se a conversao falhar, o reporte ainda funciona so com o ponto do GPS.
  it('se nao conseguir converter em endereco, mantem so latitude e longitude', async () => {
    pedirPermissao.mockResolvedValue(permissao(true));
    lerPosicao.mockResolvedValue(posicao);
    converterEmEndereco.mockRejectedValue(new Error('sem rede'));

    const local = await obterLocalizacao();

    expect(local).toEqual({ latitude: -23.5505, longitude: -46.6333, endereco: undefined });
  });

  it('endereco vazio na resposta do aparelho: sem endereco', async () => {
    pedirPermissao.mockResolvedValue(permissao(true));
    lerPosicao.mockResolvedValue(posicao);
    converterEmEndereco.mockResolvedValue([]);

    expect((await obterLocalizacao()).endereco).toBeUndefined();
  });
});

describe('montarEndereco', () => {
  const base = { street: null, streetNumber: null, district: null, city: null, name: null };

  it('junta rua, numero, bairro e cidade', () => {
    expect(montarEndereco(enderecoDoAparelho)).toBe('Rua das Flores, 120 - Centro, São Paulo');
  });

  it('rua sem numero', () => {
    expect(montarEndereco({ ...base, street: 'Rua das Flores', city: 'Santos' })).toBe(
      'Rua das Flores - Santos',
    );
  });

  it('so cidade', () => {
    expect(montarEndereco({ ...base, city: 'Santos' })).toBe('Santos');
  });

  it('sem rua, usa o nome do local quando existe', () => {
    expect(montarEndereco({ ...base, name: 'Praça da Sé', city: 'São Paulo' })).toBe(
      'Praça da Sé - São Paulo',
    );
  });

  it('sem nenhuma informacao, devolve undefined', () => {
    expect(montarEndereco(base)).toBeUndefined();
  });
});
