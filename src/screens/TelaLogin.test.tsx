import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { ErroApi } from '../services/api/erro';
import { criarAuthApiMock, montarTela, sessaoDeTeste } from '../test-utils/montar-tela';
import { TelaLogin } from './TelaLogin';

function TelaCadastroFalsa() {
  return <Text>Tela de cadastro</Text>;
}

async function montar(auth = criarAuthApiMock()) {
  await montarTela(TelaLogin, { auth, rotas: { cadastro: TelaCadastroFalsa } });
  return auth;
}

async function preencher(email: string, senha: string) {
  await fireEvent.changeText(screen.getByLabelText('E-mail'), email);
  await fireEvent.changeText(screen.getByLabelText('Senha'), senha);
}

const entrar = () => fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

describe('TelaLogin', () => {
  it('mostra a marca Voz & Via no topo', async () => {
    await montar();
    expect(screen.getByText('Voz & Via')).toBeOnTheScreen();
  });

  it('mostra título, campos, botão Entrar e o caminho para criar conta', async () => {
    await montar();
    expect(screen.getByRole('header', { name: 'Entrar' })).toBeOnTheScreen();
    expect(screen.getByLabelText('E-mail')).toBeOnTheScreen();
    expect(screen.getByLabelText('Senha')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeOnTheScreen();
  });

  it('o campo de senha esconde o que é digitado', async () => {
    await montar();
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);
  });

  it('com campos vazios mostra as mensagens e NÃO chama a API', async () => {
    const auth = await montar();
    await entrar();
    expect(screen.getByText('Informe o seu e-mail.')).toBeOnTheScreen();
    expect(screen.getByText('Informe a sua senha.')).toBeOnTheScreen();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('e-mail em formato errado é recusado antes de chamar a API', async () => {
    const auth = await montar();
    await preencher('maria', 'Senha@123');
    await entrar();
    expect(screen.getByText(/Digite um e-mail válido/)).toBeOnTheScreen();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('com dados válidos chama a API (e-mail sem espaços) e abre a sessão', async () => {
    const auth = criarAuthApiMock();
    auth.login.mockResolvedValue(sessaoDeTeste);
    await montar(auth);
    await preencher('  maria@exemplo.com ', 'Senha@123');
    await entrar();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('autenticado'));
    expect(auth.login).toHaveBeenCalledWith('maria@exemplo.com', 'Senha@123');
  });

  it('credencial errada (401) mostra mensagem amigável e segue sem sessão', async () => {
    const auth = criarAuthApiMock();
    auth.login.mockRejectedValue(new ErroApi(401, 'Unauthorized'));
    await montar(auth);
    await preencher('maria@exemplo.com', 'SenhaErrada1');
    await entrar();
    expect(await screen.findByText('E-mail ou senha incorretos.')).toBeOnTheScreen();
    expect(screen.getByTestId('status')).toHaveTextContent('anonimo');
  });

  it('sem conexão (status 0) avisa sobre a internet', async () => {
    const auth = criarAuthApiMock();
    auth.login.mockRejectedValue(new ErroApi(0, 'Network request failed'));
    await montar(auth);
    await preencher('maria@exemplo.com', 'Senha@123');
    await entrar();
    expect(await screen.findByText(/Sem conexão/)).toBeOnTheScreen();
  });

  it('enquanto envia o botão fica ocupado e depois volta ao normal', async () => {
    const auth = criarAuthApiMock();
    let terminar: (erro: Error) => void = () => {};
    auth.login.mockReturnValue(new Promise((_, rejeitar) => (terminar = rejeitar)));
    await montar(auth);
    await preencher('maria@exemplo.com', 'Senha@123');
    await entrar();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeBusy();

    terminar(new ErroApi(401, 'x'));
    await screen.findByText('E-mail ou senha incorretos.');
    expect(screen.getByRole('button', { name: 'Entrar' })).not.toBeBusy();
  });

  it('o botão Criar conta leva à tela de cadastro', async () => {
    await montar();
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('Tela de cadastro')).toBeOnTheScreen();
  });
});
