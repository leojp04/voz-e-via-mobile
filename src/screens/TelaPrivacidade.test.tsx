import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Alert, Text } from 'react-native';

import { ErroApi, ErroExclusaoParcial } from '../services/api/erro';
import {
  criarArmazenamentoEmMemoria,
  criarAuthApiMock,
  montarTela,
  sessaoDeTeste,
} from '../test-utils/montar-tela';
import { TelaPrivacidade } from './TelaPrivacidade';

// Excluir a conta só aparece para quem está logado (a política também abre sem sessão).
async function montarLogado(auth = criarAuthApiMock()) {
  const armazenamento = criarArmazenamentoEmMemoria(sessaoDeTeste);
  await montarTela(TelaPrivacidade, {
    auth,
    armazenamento,
    rotas: { login: () => <Text>Destino login</Text> },
  });
  return { auth, armazenamento };
}

// Pega o botão que o Alert oferece (ex.: "Excluir minha conta") e o aciona como o usuário faria.
async function tocarNoAlerta(alerta: jest.SpyInstance, texto: string) {
  const botoes = alerta.mock.calls[0][2] as { text: string; onPress?: () => void }[];
  await botoes.find((b) => b.text === texto)?.onPress?.();
}

describe('TelaPrivacidade: excluir a conta', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sem sessão não mostra o botão de excluir', async () => {
    await montarTela(TelaPrivacidade, { auth: criarAuthApiMock() });
    expect(screen.queryByRole('button', { name: 'Excluir minha conta' })).not.toBeOnTheScreen();
  });

  it('com sessão mostra o botão de excluir', async () => {
    await montarLogado();
    expect(screen.getByRole('button', { name: 'Excluir minha conta' })).toBeOnTheScreen();
  });

  it('o botão só pede confirmação: nada é apagado ao primeiro toque', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { auth } = await montarLogado();
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir minha conta' }));
    expect(alerta).toHaveBeenCalledTimes(1);
    expect(auth.excluirConta).not.toHaveBeenCalled();
    const botoes = alerta.mock.calls[0][2] as { text: string; style?: string }[];
    expect(botoes.map((b) => b.text)).toEqual(['Cancelar', 'Excluir minha conta']);
    expect(botoes[1].style).toBe('destructive');
  });

  it('o aviso explica que não dá para desfazer', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await montarLogado();
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir minha conta' }));
    expect(alerta.mock.calls[0][1]).toMatch(/não pode ser desfeita/i);
  });

  it('Cancelar não exclui nada e mantém a sessão', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { auth } = await montarLogado();
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir minha conta' }));
    await tocarNoAlerta(alerta, 'Cancelar');
    expect(auth.excluirConta).not.toHaveBeenCalled();
    expect(screen.getByTestId('status')).toHaveTextContent('autenticado');
  });

  it('confirmar exclui na API com o token, apaga o cofre e leva ao login', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const auth = criarAuthApiMock();
    auth.excluirConta.mockResolvedValue(undefined);
    const { armazenamento } = await montarLogado(auth);
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir minha conta' }));
    await tocarNoAlerta(alerta, 'Excluir minha conta');

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonimo'));
    expect(auth.excluirConta).toHaveBeenCalledWith('tok-123');
    expect(armazenamento.apagar).toHaveBeenCalled();
    expect(await screen.findByText('Destino login')).toBeOnTheScreen();
  });

  it('se a API falha, avisa com frase amigável e mantém a sessão', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const auth = criarAuthApiMock();
    auth.excluirConta.mockRejectedValue(new ErroApi(0, 'Network request failed'));
    await montarLogado(auth);
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir minha conta' }));
    await tocarNoAlerta(alerta, 'Excluir minha conta');

    await waitFor(() => expect(alerta).toHaveBeenCalledTimes(2));
    expect(alerta.mock.calls[1]).toEqual([
      'Não foi possível excluir',
      'Sem conexão. A sua conta não foi excluída. Tente de novo.',
    ]);
    expect(screen.getByTestId('status')).toHaveTextContent('autenticado');
    expect(screen.queryByText('Destino login')).not.toBeOnTheScreen();
  });

  it('se os reportes já foram apagados mas a conta não, diz isso e mantém a sessão para tentar de novo', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const auth = criarAuthApiMock();
    auth.excluirConta.mockRejectedValue(new ErroExclusaoParcial(new ErroApi(503, 'Indisponível')));
    await montarLogado(auth);
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir minha conta' }));
    await tocarNoAlerta(alerta, 'Excluir minha conta');

    await waitFor(() => expect(alerta).toHaveBeenCalledTimes(2));
    expect(alerta.mock.calls[1]).toEqual([
      'Não foi possível excluir',
      'Seus reportes foram apagados, mas a sua conta ainda não foi excluída. Toque em "Excluir minha conta" de novo.',
    ]);
    expect(screen.getByTestId('status')).toHaveTextContent('autenticado');
    expect(screen.queryByText('Destino login')).not.toBeOnTheScreen();
  });
});

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

  it('diz que não coletamos o tipo de deficiência', async () => {
    await montarTela(TelaPrivacidade, { auth: criarAuthApiMock() });
    expect(screen.getByText(/tipo de deficiência/i)).toBeOnTheScreen();
  });

  it('tem a seção de dados de saúde como cabeçalho', async () => {
    await montarTela(TelaPrivacidade, { auth: criarAuthApiMock() });
    expect(screen.getByRole('header', { name: 'Dados de saúde (opcionais)' })).toBeOnTheScreen();
  });

  it('diz que condições de saúde, medicamentos e mobilidade são dados de saúde e opcionais', async () => {
    await montarTela(TelaPrivacidade, { auth: criarAuthApiMock() });
    expect(
      screen.getByText(/condições de saúde, medicamentos e mobilidade.*dados de saúde/i),
    ).toBeOnTheScreen();
    expect(screen.getByText(/você escolhe se informa/i)).toBeOnTheScreen();
  });

  it('diz que esses dados só vão na mensagem de socorro aos contatos', async () => {
    await montarTela(TelaPrivacidade, { auth: criarAuthApiMock() });
    expect(
      screen.getByText(/só vão na mensagem de socorro enviada aos seus contatos/i),
    ).toBeOnTheScreen();
  });

  it('não afirma mais que deixamos de coletar dados de saúde', async () => {
    await montarTela(TelaPrivacidade, { auth: criarAuthApiMock() });
    expect(screen.queryByText(/nem dados de saúde/i)).not.toBeOnTheScreen();
  });

  it('a frase de exclusão lista o que some, inclusive os reportes com histórico e fotos', async () => {
    await montarTela(TelaPrivacidade, { auth: criarAuthApiMock() });
    expect(
      screen.getByText(
        /perfil de emergência, contatos, pedidos de socorro, avisos e histórico de voz/i,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(/reportes de zeladoria também são apagados.*histórico e as fotos/i),
    ).toBeOnTheScreen();
  });

  it('não diz mais que os reportes ficam com a equipe depois de excluir a conta (a API .NET apaga)', async () => {
    await montarTela(TelaPrivacidade, { auth: criarAuthApiMock() });
    expect(screen.queryByText(/reportes de zeladoria não são apagados/i)).not.toBeOnTheScreen();
    expect(screen.queryByText(/sem o seu nome nem o seu e-mail/i)).not.toBeOnTheScreen();
  });

  it('diz que cancelar um reporte não apaga o registro até a conta ser excluída', async () => {
    await montarTela(TelaPrivacidade, { auth: criarAuthApiMock() });
    expect(
      screen.getByText(
        /cancelar um reporte.*o registro continua guardado até você excluir a conta/i,
      ),
    ).toBeOnTheScreen();
  });

  it('não promete mais que cancelar o reporte o tira do sistema', async () => {
    await montarTela(TelaPrivacidade, { auth: criarAuthApiMock() });
    expect(screen.queryByText(/cancele cada reporte antes de excluir/i)).not.toBeOnTheScreen();
  });

  it('explica o áudio: no celular quando dá, e o aviso quando o sistema (Apple ou Google) entra', async () => {
    await montarTela(TelaPrivacidade, { auth: criarAuthApiMock() });
    expect(screen.getByText(/dentro dele e o áudio não sai do aparelho/i)).toBeOnTheScreen();
    expect(screen.getByText(/avisa antes/i)).toBeOnTheScreen();
    expect(screen.getByText(/Apple ou Google/i)).toBeOnTheScreen();
    expect(screen.getByText(/só o texto é enviado/i)).toBeOnTheScreen();
  });

  it('não promete mais que o áudio nunca sai do celular (isso nem sempre é verdade)', async () => {
    await montarTela(TelaPrivacidade, { auth: criarAuthApiMock() });
    expect(screen.queryByText(/não sai do seu celular/i)).not.toBeOnTheScreen();
  });

  it('cita o direito de excluir a conta e a LGPD', async () => {
    await montarTela(TelaPrivacidade, { auth: criarAuthApiMock() });
    expect(screen.getByText(/excluir a sua conta/i)).toBeOnTheScreen();
    expect(screen.getAllByText(/LGPD/).length).toBeGreaterThan(0);
  });
});
