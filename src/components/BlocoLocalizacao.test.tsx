import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';

import { urlDoMapa } from '../utils/url-do-mapa';
import { BlocoLocalizacao } from './BlocoLocalizacao';

const local = {
  latitude: -23.5505,
  longitude: -46.6333,
  endereco: 'Rua das Flores, 120 - Centro, São Paulo',
};

function montar(extras: Partial<Parameters<typeof BlocoLocalizacao>[0]> = {}) {
  const props = { localizacao: null, obtendo: false, aoUsar: jest.fn(), ...extras };
  return { props, pronto: render(<BlocoLocalizacao {...props} />) };
}

afterEach(() => jest.restoreAllMocks());

describe('BlocoLocalizacao', () => {
  it('sem localizacao: mostra so o botao "Usar minha localização"', async () => {
    await montar().pronto;
    expect(screen.getByText('Localização')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Usar minha localização' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Ver no mapa' })).not.toBeOnTheScreen();
  });

  it('o botao chama a acao de usar a localizacao', async () => {
    const { props, pronto } = montar();
    await pronto;
    await fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização' }));
    expect(props.aoUsar).toHaveBeenCalledTimes(1);
  });

  it('obtendo: o botao fica ocupado e nao aceita novo toque', async () => {
    const { props, pronto } = montar({ obtendo: true });
    await pronto;
    const botao = screen.getByRole('button', { name: 'Usar minha localização' });
    expect(botao).toBeBusy();
    await fireEvent.press(botao);
    expect(props.aoUsar).not.toHaveBeenCalled();
  });

  it('com localizacao: mostra o endereco e as coordenadas', async () => {
    await montar({ localizacao: local }).pronto;
    expect(screen.getByText(local.endereco)).toBeOnTheScreen();
    expect(screen.getByText('-23.55050, -46.63330')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Usar minha localização' })).not.toBeOnTheScreen();
  });

  it('com localizacao mas sem endereco: explica que o ponto foi registrado', async () => {
    await montar({ localizacao: { latitude: -23.5, longitude: -46.6 } }).pronto;
    expect(
      screen.getByText('Endereço não encontrado, mas o ponto no mapa foi registrado.'),
    ).toBeOnTheScreen();
  });

  it('"Atualizar localização" pede a posicao de novo', async () => {
    const { props, pronto } = montar({ localizacao: local });
    await pronto;
    await fireEvent.press(screen.getByRole('button', { name: 'Atualizar localização' }));
    expect(props.aoUsar).toHaveBeenCalledTimes(1);
  });

  it('"Ver no mapa" abre o app de mapas no ponto', async () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await montar({ localizacao: local }).pronto;

    await fireEvent.press(screen.getByRole('button', { name: 'Ver no mapa' }));

    expect(abrir).toHaveBeenCalledWith(urlDoMapa(local.latitude, local.longitude));
  });

  it('se nao houver app de mapas, avisa em vez de falhar calado', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('sem app'));
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await montar({ localizacao: local }).pronto;

    await fireEvent.press(screen.getByRole('button', { name: 'Ver no mapa' }));

    await Promise.resolve();
    expect(alerta).toHaveBeenCalledWith(
      'Não foi possível abrir o mapa',
      'Seu aparelho não tem um aplicativo de mapas disponível.',
    );
  });

  it('mostra o erro como alerta', async () => {
    await montar({ erro: 'Para usar sua localização, permita o acesso nas configurações.' }).pronto;
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Para usar sua localização, permita o acesso nas configurações.',
    );
  });
});
