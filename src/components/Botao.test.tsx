import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ALVO_MINIMO } from '../theme';
import { Botao } from './Botao';

describe('Botao', () => {
  it('é um botão acessível com o título como rótulo', async () => {
    await render(<Botao titulo="Entrar" onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeOnTheScreen();
  });

  it('usa o rótulo de acessibilidade quando informado', async () => {
    await render(<Botao titulo="Sair" rotulo="Sair da conta" onPress={jest.fn()} />);
    expect(screen.getByLabelText('Sair da conta')).toBeOnTheScreen();
  });

  it('chama onPress ao tocar', async () => {
    const aoTocar = jest.fn();
    await render(<Botao titulo="Entrar" onPress={aoTocar} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(aoTocar).toHaveBeenCalledTimes(1);
  });

  it('carregando: não chama onPress e avisa que está ocupado', async () => {
    const aoTocar = jest.fn();
    await render(<Botao titulo="Entrar" carregando onPress={aoTocar} />);
    const botao = screen.getByRole('button', { name: 'Entrar' });
    await fireEvent.press(botao);
    expect(aoTocar).not.toHaveBeenCalled();
    expect(botao).toBeBusy();
    expect(botao).toBeDisabled();
  });

  it('desabilitado: não chama onPress', async () => {
    const aoTocar = jest.fn();
    await render(<Botao titulo="Entrar" desabilitado onPress={aoTocar} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(aoTocar).not.toHaveBeenCalled();
  });

  it('a versão grande tem área de toque bem maior que o mínimo', async () => {
    await render(<Botao titulo="Reportar" grande onPress={jest.fn()} />);
    const estilo = StyleSheet.flatten(screen.getByRole('button', { name: 'Reportar' }).props.style);
    expect(estilo.minHeight).toBeGreaterThanOrEqual(72);
  });

  it('tem área de toque de pelo menos 48 dp', async () => {
    await render(<Botao titulo="Entrar" onPress={jest.fn()} />);
    const estilo = StyleSheet.flatten(screen.getByRole('button', { name: 'Entrar' }).props.style);
    expect(estilo.minHeight).toBeGreaterThanOrEqual(ALVO_MINIMO);
  });
});
