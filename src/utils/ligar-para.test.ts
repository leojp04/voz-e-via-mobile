import { Alert, Linking } from 'react-native';

import { ligarPara } from './ligar-para';

afterEach(() => jest.restoreAllMocks());

describe('ligarPara', () => {
  it('abre o discador com o numero, so com digitos', () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    ligarPara('(11) 98888-7777');
    expect(abrir).toHaveBeenCalledWith('tel:11988887777');
  });

  it('sem discador (ex.: tablet), avisa em vez de falhar calado', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('sem discador'));
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    ligarPara('11988887777');
    await Promise.resolve();
    await Promise.resolve();
    expect(alerta).toHaveBeenCalledWith(
      'Não foi possível ligar',
      'Seu aparelho não consegue fazer ligações.',
    );
  });
});
