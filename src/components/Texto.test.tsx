import { render, screen } from '@testing-library/react-native';

import { fontes } from '../theme';
import { Texto } from './Texto';

describe('Texto', () => {
  it('usa a fonte Atkinson Hyperlegible normal por padrão', async () => {
    await render(<Texto>Olá</Texto>);
    expect(screen.getByText('Olá')).toHaveStyle({ fontFamily: fontes.familia.regular });
  });

  it('deixa a tela trocar para o negrito e manter o resto do estilo', async () => {
    await render(
      <Texto style={{ fontFamily: fontes.familia.negrito, fontSize: 32 }}>Título</Texto>,
    );
    expect(screen.getByText('Título')).toHaveStyle({
      fontFamily: fontes.familia.negrito,
      fontSize: 32,
    });
  });

  it('repassa as props de acessibilidade, como o papel de cabeçalho', async () => {
    await render(<Texto accessibilityRole="header">Entrar</Texto>);
    expect(screen.getByRole('header', { name: 'Entrar' })).toBeOnTheScreen();
  });
});
