import { render, screen } from '@testing-library/react-native';

import { Icone } from './Icone';

describe('Icone', () => {
  it('é decorativo: fica escondido do leitor de tela (o botão ao lado já tem rótulo)', async () => {
    await render(<Icone nome="mic" />);
    const arvore = JSON.stringify(screen.toJSON());
    expect(arvore).toContain('"accessibilityElementsHidden":true');
    expect(arvore).toContain('"importantForAccessibility":"no-hide-descendants"');
  });
});
