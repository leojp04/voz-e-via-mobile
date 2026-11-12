import { screen } from 'expo-router/testing-library';

import { criarAuthApiMock, montarTela } from '../test-utils/montar-tela';
import { TelaPrivacidade } from './TelaPrivacidade';

describe('TelaPrivacidade', () => {
  it('mostra o título e um botão Voltar (as telas não têm cabeçalho próprio)', async () => {
    await montarTela(TelaPrivacidade, { auth: criarAuthApiMock() });
    expect(screen.getByRole('header', { name: 'Política de Privacidade' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeOnTheScreen();
  });
});
