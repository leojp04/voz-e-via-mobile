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

  // Com a letra do sistema no máximo (310%) um título de 32 pt vira ~99 pt e palavras como
  // "reportes" quebram no meio. 200% é o que a WCAG 1.4.4 pede e ainda cabe na largura.
  it('limita o crescimento de um cabeçalho a 200% da letra do sistema', async () => {
    await render(<Texto accessibilityRole="header">Meus reportes</Texto>);
    expect(screen.getByRole('header', { name: 'Meus reportes' }).props.maxFontSizeMultiplier).toBe(
      2,
    );
  });

  it('deixa a tela escolher outro limite para um cabeçalho', async () => {
    await render(
      <Texto accessibilityRole="header" maxFontSizeMultiplier={1.5}>
        Entrar
      </Texto>,
    );
    expect(screen.getByRole('header', { name: 'Entrar' }).props.maxFontSizeMultiplier).toBe(1.5);
  });

  it('não limita o texto comum: ele continua crescendo com a letra do sistema', async () => {
    await render(<Texto>Olá</Texto>);
    expect(screen.getByText('Olá').props.maxFontSizeMultiplier).toBeUndefined();
  });
});
