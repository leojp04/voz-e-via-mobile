import { fireEvent, render, screen } from '@testing-library/react-native';

import { CaixaConsentimento } from './CaixaConsentimento';

const TEXTO = 'Li e aceito o uso dos meus dados.';

describe('CaixaConsentimento', () => {
  it('é uma caixa de seleção acessível, desmarcada quando marcada=false', async () => {
    await render(<CaixaConsentimento texto={TEXTO} marcada={false} aoAlternar={jest.fn()} />);
    const caixa = screen.getByRole('checkbox', { name: TEXTO });
    expect(caixa).toBeOnTheScreen();
    expect(caixa).not.toBeChecked();
  });

  it('aparece marcada quando marcada=true', async () => {
    await render(<CaixaConsentimento texto={TEXTO} marcada aoAlternar={jest.fn()} />);
    expect(screen.getByRole('checkbox', { name: TEXTO })).toBeChecked();
  });

  it('ao tocar pede para alternar', async () => {
    const aoAlternar = jest.fn();
    await render(<CaixaConsentimento texto={TEXTO} marcada={false} aoAlternar={aoAlternar} />);
    await fireEvent.press(screen.getByRole('checkbox', { name: TEXTO }));
    expect(aoAlternar).toHaveBeenCalledTimes(1);
  });

  it('mostra a mensagem de erro quando há erro', async () => {
    await render(
      <CaixaConsentimento
        texto={TEXTO}
        marcada={false}
        aoAlternar={jest.fn()}
        erro="É preciso aceitar."
      />,
    );
    expect(screen.getByText('É preciso aceitar.')).toBeOnTheScreen();
  });
});
