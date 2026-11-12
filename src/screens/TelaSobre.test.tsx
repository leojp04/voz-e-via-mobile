import { screen } from 'expo-router/testing-library';

import { criarAuthApiMock, montarTela } from '../test-utils/montar-tela';
import { TelaSobre } from './TelaSobre';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.2.3', extra: { commitHash: 'abc1234' } } },
}));

describe('TelaSobre', () => {
  it('mostra o título, a versão e o hash do commit', async () => {
    await montarTela(TelaSobre, { auth: criarAuthApiMock() });
    expect(screen.getByRole('header', { name: 'Sobre o app' })).toBeOnTheScreen();
    expect(screen.getByText('1.2.3')).toBeOnTheScreen();
    expect(screen.getByText('abc1234')).toBeOnTheScreen();
  });

  it('cada dado tem um rótulo falado completo para o leitor de tela', async () => {
    await montarTela(TelaSobre, { auth: criarAuthApiMock() });
    expect(screen.getByLabelText('Versão do app: 1.2.3')).toBeOnTheScreen();
    expect(screen.getByLabelText('Commit do código: abc1234')).toBeOnTheScreen();
  });

  it('tem botão Voltar (as telas não têm cabeçalho próprio)', async () => {
    await montarTela(TelaSobre, { auth: criarAuthApiMock() });
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeOnTheScreen();
  });
});
