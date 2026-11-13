import { render, screen } from '@testing-library/react-native';

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
});
