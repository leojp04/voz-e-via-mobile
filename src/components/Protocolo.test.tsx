import { render, screen } from '@testing-library/react-native';

import { Protocolo } from './Protocolo';

describe('Protocolo', () => {
  it('mostra o numero do protocolo', async () => {
    await render(<Protocolo valor="VV-2026-000007" />);
    expect(screen.getByText('VV-2026-000007')).toBeOnTheScreen();
  });

  // Com a letra do sistema muito grande o codigo quebrava no meio ("VV-2026-00000/1"). Agora fica
  // numa linha so e a fonte encolhe o necessario para caber. Descoberto no simulador.
  it('fica numa linha so e encolhe a fonte para caber, em vez de quebrar no meio', async () => {
    await render(<Protocolo valor="VV-2026-000007" />);
    const texto = screen.getByText('VV-2026-000007');
    expect(texto.props.numberOfLines).toBe(1);
    expect(texto.props.adjustsFontSizeToFit).toBe(true);
    expect(texto.props.minimumFontScale).toBeGreaterThan(0);
  });
});
