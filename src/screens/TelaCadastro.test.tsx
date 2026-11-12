import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { ErroApi } from '../services/api/erro';
import { criarAuthApiMock, montarTela, sessaoDeTeste } from '../test-utils/montar-tela';
import { TelaCadastro } from './TelaCadastro';

function TelaPrivacidadeFalsa() {
  return <Text>Tela de privacidade</Text>;
}

const TEXTO_CONSENTIMENTO = 'Li e aceito o uso dos meus dados, conforme a Política de Privacidade.';

async function montar(auth = criarAuthApiMock()) {
  await montarTela(TelaCadastro, { auth, rotas: { privacidade: TelaPrivacidadeFalsa } });
  return auth;
}

async function preencherTudo() {
  await fireEvent.changeText(screen.getByLabelText('Nome'), '  Maria Silva ');
  await fireEvent.changeText(screen.getByLabelText('E-mail'), ' maria@exemplo.com ');
  await fireEvent.changeText(screen.getByLabelText('Telefone com DDD'), '(11) 98765-4321');
  await fireEvent.changeText(screen.getByLabelText('Senha'), 'Senha@123');
}

const aceitar = () => fireEvent.press(screen.getByRole('checkbox', { name: TEXTO_CONSENTIMENTO }));
const criar = () => fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));

describe('TelaCadastro', () => {
  it('mostra os campos, o papel Cidadão já escolhido e o consentimento DESMARCADO', async () => {
    await montar();
    expect(screen.getByRole('header', { name: 'Criar conta' })).toBeOnTheScreen();
    for (const rotulo of ['Nome', 'E-mail', 'Telefone com DDD', 'Senha']) {
      expect(screen.getByLabelText(rotulo)).toBeOnTheScreen();
    }
    expect(screen.getByRole('radio', { name: 'Cidadão' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Cuidador' })).not.toBeSelected();
    expect(screen.getByRole('checkbox', { name: TEXTO_CONSENTIMENTO })).not.toBeChecked();
  });

  it('não pergunta nada sobre deficiência (dado sensível, LGPD)', async () => {
    await montar();
    expect(screen.queryByText(/defici/i)).not.toBeOnTheScreen();
  });

  it('com tudo vazio mostra todas as mensagens e NÃO chama a API', async () => {
    const auth = await montar();
    await criar();
    expect(screen.getByText('Informe o seu nome.')).toBeOnTheScreen();
    expect(screen.getByText('Informe o seu e-mail.')).toBeOnTheScreen();
    expect(screen.getByText('Informe o seu telefone com DDD.')).toBeOnTheScreen();
    expect(screen.getByText('Informe a sua senha.')).toBeOnTheScreen();
    expect(
      screen.getByText('Para criar a conta, é preciso aceitar o uso dos seus dados.'),
    ).toBeOnTheScreen();
    expect(auth.cadastrar).not.toHaveBeenCalled();
  });

  it('sem aceitar o consentimento não envia, mesmo com o resto correto', async () => {
    const auth = await montar();
    await preencherTudo();
    await criar();
    expect(screen.getByText(/é preciso aceitar o uso dos seus dados/)).toBeOnTheScreen();
    expect(auth.cadastrar).not.toHaveBeenCalled();
  });

  it('ao marcar o consentimento, a mensagem de erro dele some na hora', async () => {
    await montar();
    await criar();
    expect(screen.getByText(/é preciso aceitar o uso dos seus dados/)).toBeOnTheScreen();

    await aceitar();
    expect(screen.queryByText(/é preciso aceitar o uso dos seus dados/)).not.toBeOnTheScreen();
  });

  it('cadastra como Cidadão (padrão), depois entra sozinho', async () => {
    const auth = criarAuthApiMock();
    auth.cadastrar.mockResolvedValue(sessaoDeTeste.usuario);
    auth.login.mockResolvedValue(sessaoDeTeste);
    await montar(auth);
    await preencherTudo();
    await aceitar();
    await criar();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('autenticado'));
    expect(auth.cadastrar).toHaveBeenCalledWith({
      nome: 'Maria Silva',
      email: 'maria@exemplo.com',
      telefone: '11987654321',
      senha: 'Senha@123',
      role: 'CIDADAO',
      consentimento: true,
    });
    expect(auth.login).toHaveBeenCalledWith('maria@exemplo.com', 'Senha@123');
  });

  it('escolher Cuidador envia o papel CUIDADOR', async () => {
    const auth = criarAuthApiMock();
    auth.cadastrar.mockResolvedValue(sessaoDeTeste.usuario);
    auth.login.mockResolvedValue(sessaoDeTeste);
    await montar(auth);
    await fireEvent.press(screen.getByRole('radio', { name: 'Cuidador' }));
    expect(screen.getByRole('radio', { name: 'Cuidador' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Cidadão' })).not.toBeSelected();
    await preencherTudo();
    await aceitar();
    await criar();

    await waitFor(() => expect(auth.cadastrar).toHaveBeenCalled());
    expect(auth.cadastrar.mock.calls[0][0].role).toBe('CUIDADOR');
  });

  it('e-mail já cadastrado (409) marca o campo e-mail e não tenta entrar', async () => {
    const auth = criarAuthApiMock();
    auth.cadastrar.mockRejectedValue(new ErroApi(409, 'Conflict'));
    await montar(auth);
    await preencherTudo();
    await aceitar();
    await criar();

    expect(await screen.findByText('Este e-mail já tem conta.')).toBeOnTheScreen();
    expect(auth.login).not.toHaveBeenCalled();
    expect(screen.getByTestId('status')).toHaveTextContent('anonimo');
  });

  it('sem conexão ao cadastrar mostra aviso amigável', async () => {
    const auth = criarAuthApiMock();
    auth.cadastrar.mockRejectedValue(new ErroApi(0, 'Network request failed'));
    await montar(auth);
    await preencherTudo();
    await aceitar();
    await criar();
    expect(await screen.findByText(/Sem conexão/)).toBeOnTheScreen();
  });

  it('conta criada mas login falhou: avisa e continua sem sessão', async () => {
    const auth = criarAuthApiMock();
    auth.cadastrar.mockResolvedValue(sessaoDeTeste.usuario);
    auth.login.mockRejectedValue(new ErroApi(0, 'Network request failed'));
    await montar(auth);
    await preencherTudo();
    await aceitar();
    await criar();
    expect(await screen.findByText(/Sem conexão/)).toBeOnTheScreen();
    expect(screen.getByTestId('status')).toHaveTextContent('anonimo');
  });

  it('enquanto envia o botão fica ocupado', async () => {
    const auth = criarAuthApiMock();
    let terminar: (erro: Error) => void = () => {};
    auth.cadastrar.mockReturnValue(new Promise((_, rejeitar) => (terminar = rejeitar)));
    await montar(auth);
    await preencherTudo();
    await aceitar();
    await criar();
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeBusy();

    terminar(new ErroApi(409, 'x'));
    await screen.findByText('Este e-mail já tem conta.');
    expect(screen.getByRole('button', { name: 'Criar conta' })).not.toBeBusy();
  });

  it('o link da Política de Privacidade abre a tela de privacidade', async () => {
    await montar();
    await fireEvent.press(screen.getByRole('button', { name: 'Ler a Política de Privacidade' }));
    expect(await screen.findByText('Tela de privacidade')).toBeOnTheScreen();
  });
});
