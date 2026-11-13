import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { AtalhoQuadrado } from './AtalhoQuadrado';

describe('AtalhoQuadrado', () => {
  it('é um botão cujo rótulo falado é o título quando não há rótulo próprio', async () => {
    await render(
      <AtalhoQuadrado titulo="Meus reportes" icone="list-outline" onPress={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Meus reportes' })).toBeOnTheScreen();
  });

  it('usa o rótulo falado quando informado, e mostra o título curto na tela', async () => {
    await render(
      <AtalhoQuadrado
        titulo="Contatos"
        rotulo="Contatos de emergência"
        icone="call-outline"
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Contatos de emergência' })).toBeOnTheScreen();
    expect(screen.getByText('Contatos')).toBeOnTheScreen();
  });

  it('chama onPress ao tocar', async () => {
    const aoTocar = jest.fn();
    await render(<AtalhoQuadrado titulo="Meus reportes" icone="list-outline" onPress={aoTocar} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Meus reportes' }));
    expect(aoTocar).toHaveBeenCalledTimes(1);
  });

  it('tem área de toque bem acima do mínimo (pelo menos 96 dp de altura)', async () => {
    await render(
      <AtalhoQuadrado titulo="Meus reportes" icone="list-outline" onPress={jest.fn()} />,
    );
    const estilo = StyleSheet.flatten(
      screen.getByRole('button', { name: 'Meus reportes' }).props.style,
    );
    expect(estilo.minHeight).toBeGreaterThanOrEqual(96);
  });
});
