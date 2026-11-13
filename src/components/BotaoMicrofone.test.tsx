import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { BotaoMicrofone } from './BotaoMicrofone';

describe('BotaoMicrofone', () => {
  it('é um botão com rótulo falado completo', async () => {
    await render(<BotaoMicrofone onPress={jest.fn()} />);
    expect(
      screen.getByRole('button', { name: 'Falar com o assistente por voz' }),
    ).toBeOnTheScreen();
  });

  it('mostra a dica "Toque e fale" para quem enxerga', async () => {
    await render(<BotaoMicrofone onPress={jest.fn()} />);
    expect(screen.getByText('Toque e fale')).toBeOnTheScreen();
  });

  it('chama onPress ao tocar', async () => {
    const aoTocar = jest.fn();
    await render(<BotaoMicrofone onPress={aoTocar} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Falar com o assistente por voz' }));
    expect(aoTocar).toHaveBeenCalledTimes(1);
  });

  it('é o maior alvo da tela: pelo menos 96 dp de largura e altura', async () => {
    await render(<BotaoMicrofone onPress={jest.fn()} />);
    const estilo = StyleSheet.flatten(
      screen.getByRole('button', { name: 'Falar com o assistente por voz' }).props.style,
    );
    expect(estilo.width).toBeGreaterThanOrEqual(96);
    expect(estilo.height).toBeGreaterThanOrEqual(96);
  });
});
