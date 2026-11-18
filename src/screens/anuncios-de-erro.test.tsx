import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { AccessibilityInfo, Platform, Text } from 'react-native';

import { ErroApi } from '../services/api/erro';
import { criarAuthApiMock, montarTela } from '../test-utils/montar-tela';
import { TelaLogin } from './TelaLogin';

// No iOS o VoiceOver só lê um erro se a pessoa navegar até ele; quem aparece sozinho precisa ser
// ANUNCIADO. Aqui confere-se, na tela de Login, que o app avisa o VoiceOver (o Leonardo relatou:
// "não informa os erros, mas se eu clicar nos erros ele lê").
function TelaCadastroFalsa() {
  return <Text>Tela de cadastro</Text>;
}

// O ambiente de teste do React Native já troca esta API por uma função simulada. O aviso sai
// ENFILEIRADO e depois de um pequeno atraso (senão se perdia quando o VoiceOver falava o botão).
const espiao = AccessibilityInfo.announceForAccessibilityWithOptions as jest.Mock;
const FILA = { queue: true };
const esperarOAviso = (texto: string) =>
  waitFor(() => expect(espiao).toHaveBeenCalledWith(texto, FILA), { timeout: 3000 });

describe('anúncio de erros ao VoiceOver (iOS)', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    espiao.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function montar(auth = criarAuthApiMock()) {
    await montarTela(TelaLogin, { auth, rotas: { cadastro: TelaCadastroFalsa } });
    return auth;
  }

  it('com campos vazios anuncia os dois erros dos campos', async () => {
    await montar();
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    await esperarOAviso('Informe o seu e-mail.');
    await esperarOAviso('Informe a sua senha.');
  });

  it('anuncia o erro geral de uma credencial recusada pelo servidor', async () => {
    const auth = criarAuthApiMock();
    auth.login.mockRejectedValue(new ErroApi(401, 'Unauthorized'));
    await montar(auth);
    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'maria@exemplo.com');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'SenhaErrada1');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    await screen.findByText('E-mail ou senha incorretos.');

    await esperarOAviso('E-mail ou senha incorretos.');
  });

  it('não anuncia nada enquanto não há erro', async () => {
    await montar();
    expect(espiao).not.toHaveBeenCalled();
  });
});
