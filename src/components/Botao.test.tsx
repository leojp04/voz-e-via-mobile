import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ALVO_MINIMO, cores, espacos } from '../theme';
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

  it('mostra o ícone ao lado do título sem mudar o rótulo falado', async () => {
    await render(<Botao titulo="Pedir ajuda" icone="help-buoy-outline" onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Pedir ajuda' })).toBeOnTheScreen();
    expect(JSON.stringify(screen.toJSON())).toContain('"accessibilityElementsHidden":true');
  });

  it('a variante "ajuda" usa a cor terracota do tema', async () => {
    await render(<Botao titulo="Pedir ajuda" variante="ajuda" onPress={jest.fn()} />);
    const estilo = StyleSheet.flatten(
      screen.getByRole('button', { name: 'Pedir ajuda' }).props.style,
    );
    expect(estilo.backgroundColor).toBe(cores.ajuda);
  });

  // Com a letra do sistema no maximo, uma palavra longa ("Privacidade") nao cabia na largura
  // sobrando e quebrava no meio ("Privacida/de"), e o icone era empurrado para a borda.
  describe('com letra grande', () => {
    it('o título pode encolher e quebrar linha, sem empurrar o ícone para fora', async () => {
      await render(<Botao titulo="Pedir ajuda" icone="help-buoy-outline" onPress={jest.fn()} />);
      const estilo = StyleSheet.flatten(screen.getByText('Pedir ajuda').props.style);
      expect(estilo.flexShrink).toBe(1);
      expect(estilo.textAlign).toBe('center');
    });

    // A letra do sistema vai a 310%: uma palavra como "Privacidade" passa da largura do botão em
    // qualquer celular. Limitar a 250% ainda deixa o texto bem maior que o normal e cabendo.
    it('limita o crescimento do título a 250% para palavras longas caberem', async () => {
      await render(<Botao titulo="Privacidade" onPress={jest.fn()} />);
      expect(screen.getByText('Privacidade').props.maxFontSizeMultiplier).toBe(2.5);
    });

    it('deixa mais largura para o texto: margem lateral de no máximo "medio"', async () => {
      await render(<Botao titulo="Privacidade" onPress={jest.fn()} />);
      const estilo = StyleSheet.flatten(
        screen.getByRole('button', { name: 'Privacidade' }).props.style,
      );
      expect(estilo.paddingHorizontal).toBeLessThanOrEqual(espacos.medio);
    });
  });
});
