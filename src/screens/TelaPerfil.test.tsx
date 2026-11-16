import { fireEvent, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { ErroApi } from '../services/api/erro';
import type { PerfilEmergencia } from '../services/api/types';
import { criarAuthApiMock, criarPerfisApiMock, montarTela } from '../test-utils/montar-tela';
import { TelaPerfil } from './TelaPerfil';

// O Ionicons tenta carregar um arquivo de fonte (que nao existe no Jest); o icone e decorativo.
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

afterEach(() => jest.restoreAllMocks());

const existente: PerfilEmergencia = {
  id: 5,
  mobilidade: 'BENGALA',
  condicoesSaude: 'Diabetes',
  medicamentos: 'Insulina',
  observacoes: 'Moro no 3º andar',
};

function InicioFalso() {
  return <Text>Início de mentira</Text>;
}

function ContatosFalso() {
  return <Text>Contatos de mentira</Text>;
}

async function montar(configurar: (api: ReturnType<typeof criarPerfisApiMock>) => void) {
  const perfis = criarPerfisApiMock();
  configurar(perfis);
  await montarTela(InicioFalso, {
    auth: criarAuthApiMock(),
    perfis,
    rotas: { contatos: ContatosFalso, perfil: TelaPerfil },
    url: '/perfil',
  });
  return perfis;
}

async function preencher(rotulo: string, texto: string) {
  await fireEvent.changeText(screen.getByLabelText(rotulo), texto);
}

describe('TelaPerfil: criar', () => {
  it('sem perfil, mostra "Criar" com mobilidade em "Prefiro nao informar" e a frase de privacidade', async () => {
    await montar((api) => api.meu.mockResolvedValue(null));

    expect(
      await screen.findByRole('header', { name: 'Criar meu perfil de emergência' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Prefiro não informar' })).toBeSelected();
    expect(
      screen.getByText(/só vão na mensagem de socorro enviada aos seus contatos/i),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Condições de saúde (opcional)')).toHaveProp('value', '');
  });

  it('salva em branco: tudo opcional, vai NAO_INFORMADO e textos null, e volta aos contatos', async () => {
    const perfis = await montar((api) => {
      api.meu.mockResolvedValue(null);
      api.criar.mockResolvedValue({ ...existente, mobilidade: 'NAO_INFORMADO' });
    });
    await screen.findByRole('header', { name: 'Criar meu perfil de emergência' });

    await fireEvent.press(screen.getByRole('button', { name: 'Criar perfil' }));

    expect(await screen.findByText('Contatos de mentira')).toBeOnTheScreen();
    expect(perfis.criar).toHaveBeenCalledWith({
      mobilidade: 'NAO_INFORMADO',
      condicoesSaude: null,
      medicamentos: null,
      observacoes: null,
    });
  });

  it('envia o que a pessoa escolheu e digitou, sem espacos nas pontas', async () => {
    const perfis = await montar((api) => {
      api.meu.mockResolvedValue(null);
      api.criar.mockResolvedValue(existente);
    });
    await screen.findByRole('header', { name: 'Criar meu perfil de emergência' });
    await fireEvent.press(screen.getByRole('radio', { name: 'Cadeirante' }));
    await preencher('Condições de saúde (opcional)', '  Diabetes ');
    await preencher('Medicamentos (opcional)', 'Insulina');

    await fireEvent.press(screen.getByRole('button', { name: 'Criar perfil' }));

    await screen.findByText('Contatos de mentira');
    expect(perfis.criar).toHaveBeenCalledWith({
      mobilidade: 'CADEIRANTE',
      condicoesSaude: 'Diabetes',
      medicamentos: 'Insulina',
      observacoes: null,
    });
  });

  it('texto grande demais: mostra o erro no campo e nao chama a API', async () => {
    const perfis = await montar((api) => api.meu.mockResolvedValue(null));
    await screen.findByRole('header', { name: 'Criar meu perfil de emergência' });
    await preencher('Observações (opcional)', 'x'.repeat(501));

    await fireEvent.press(screen.getByRole('button', { name: 'Criar perfil' }));

    expect(await screen.findByText('Use até 500 letras neste campo.')).toBeOnTheScreen();
    expect(perfis.criar).not.toHaveBeenCalled();
  });

  it('se falhar ao salvar, diz que NAO salvou e continua na tela', async () => {
    await montar((api) => {
      api.meu.mockResolvedValue(null);
      api.criar.mockRejectedValue(new ErroApi(0, 'sem rede'));
    });
    await screen.findByRole('header', { name: 'Criar meu perfil de emergência' });

    await fireEvent.press(screen.getByRole('button', { name: 'Criar perfil' }));

    expect(
      await screen.findByText('Sem conexão. O perfil não foi salvo. Tente de novo.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Contatos de mentira')).not.toBeOnTheScreen();
  });

  it('mostra os erros por campo que o servidor devolver no 400', async () => {
    await montar((api) => {
      api.meu.mockResolvedValue(null);
      api.criar.mockRejectedValue(
        new ErroApi(400, 'invalido', { medicamentos: 'Texto inválido.' }),
      );
    });
    await screen.findByRole('header', { name: 'Criar meu perfil de emergência' });

    await fireEvent.press(screen.getByRole('button', { name: 'Criar perfil' }));

    expect(await screen.findByText('Texto inválido.')).toBeOnTheScreen();
    expect(screen.getByText('Confira os dados do perfil. Ele não foi salvo.')).toBeOnTheScreen();
  });
});

describe('TelaPerfil: editar', () => {
  it('com perfil, mostra "Meu perfil" ja preenchido', async () => {
    await montar((api) => api.meu.mockResolvedValue(existente));

    expect(
      await screen.findByRole('header', { name: 'Meu perfil de emergência' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Uso bengala' })).toBeSelected();
    expect(screen.getByLabelText('Condições de saúde (opcional)')).toHaveProp('value', 'Diabetes');
    expect(screen.getByLabelText('Medicamentos (opcional)')).toHaveProp('value', 'Insulina');
    expect(screen.getByLabelText('Observações (opcional)')).toHaveProp('value', 'Moro no 3º andar');
  });

  it('salva por atualizar (com o id) e apagar um texto manda null', async () => {
    const perfis = await montar((api) => {
      api.meu.mockResolvedValue(existente);
      api.atualizar.mockResolvedValue(existente);
    });
    await screen.findByRole('header', { name: 'Meu perfil de emergência' });
    await preencher('Medicamentos (opcional)', '   ');

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar perfil' }));

    await screen.findByText('Contatos de mentira');
    expect(perfis.atualizar).toHaveBeenCalledWith(5, {
      mobilidade: 'BENGALA',
      condicoesSaude: 'Diabetes',
      medicamentos: null,
      observacoes: 'Moro no 3º andar',
    });
    expect(perfis.criar).not.toHaveBeenCalled();
  });
});

describe('TelaPerfil: carregar', () => {
  it('enquanto carrega, avisa', async () => {
    await montar((api) => api.meu.mockReturnValue(new Promise(() => {})));
    expect(await screen.findByText('Carregando perfil…')).toBeOnTheScreen();
  });

  it('se nao conseguir carregar, avisa e deixa tentar de novo', async () => {
    const perfis = await montar((api) =>
      api.meu.mockRejectedValueOnce(new ErroApi(0, 'sem rede')).mockResolvedValueOnce(existente),
    );

    expect(
      await screen.findByText('Sem conexão. Verifique a internet e tente de novo.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(
      await screen.findByRole('header', { name: 'Meu perfil de emergência' }),
    ).toBeOnTheScreen();
    expect(perfis.meu).toHaveBeenCalledTimes(2);
  });
});
