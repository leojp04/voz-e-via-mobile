import { screen } from 'expo-router/testing-library';

import { criarAuthApiMock, montarTela } from '../test-utils/montar-tela';
import { TelaPrivacidade } from './TelaPrivacidade';

describe('TelaPrivacidade', () => {
  it('mostra o título e um botão Voltar (as telas não têm cabeçalho próprio)', async () => {
    await montarTela(TelaPrivacidade, { auth: criarAuthApiMock() });
    expect(screen.getByRole('header', { name: 'Política de Privacidade' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeOnTheScreen();
  });

  it('não é mais o esqueleto "em breve"', async () => {
    await montarTela(TelaPrivacidade, { auth: criarAuthApiMock() });
    expect(screen.queryByText(/em breve/i)).not.toBeOnTheScreen();
  });

  it.each([
    'O que coletamos',
    'Para que usamos',
    'Quem pode ver',
    'O que não coletamos',
    'Seu consentimento',
    'Seus direitos',
    'Contato',
    'Sobre este aplicativo',
  ])('tem a seção "%s" como cabeçalho (o leitor de tela pula entre títulos)', async (titulo) => {
    await montarTela(TelaPrivacidade, { auth: criarAuthApiMock() });
    expect(screen.getByRole('header', { name: titulo })).toBeOnTheScreen();
  });

  it('diz que não coletamos o tipo de deficiência nem guardamos o áudio', async () => {
    await montarTela(TelaPrivacidade, { auth: criarAuthApiMock() });
    expect(screen.getByText(/tipo de deficiência/i)).toBeOnTheScreen();
    expect(screen.getByText(/áudio.*não sai do seu celular/i)).toBeOnTheScreen();
  });

  it('cita o direito de excluir a conta e a LGPD', async () => {
    await montarTela(TelaPrivacidade, { auth: criarAuthApiMock() });
    expect(screen.getByText(/excluir a sua conta/i)).toBeOnTheScreen();
    expect(screen.getByText(/LGPD/)).toBeOnTheScreen();
  });
});
