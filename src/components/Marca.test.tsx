import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Marca } from './Marca';

describe('Marca', () => {
  it('mostra o nome do app', async () => {
    await render(<Marca />);
    expect(screen.getByText('Voz & Via')).toBeOnTheScreen();
  });

  it('o desenho do logo é decorativo: fica escondido do leitor de tela', async () => {
    await render(<Marca />);
    const arvore = JSON.stringify(screen.toJSON());
    expect(arvore).toContain('"accessibilityElementsHidden":true');
    expect(arvore).toContain('"importantForAccessibility":"no-hide-descendants"');
  });

  // Com a letra do sistema no maximo o nome e maior que a sobra da linha: se nao encolher, vaza
  // pela borda da tela (visto no simulador com accessibility-extra-extra-extra-large).
  it('o nome pode encolher e quebrar linha em vez de vazar pela borda da tela', async () => {
    await render(<Marca />);
    const estilo = StyleSheet.flatten(screen.getByText('Voz & Via').props.style);
    expect(estilo.flexShrink).toBe(1);
  });
});
