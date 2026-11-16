import { fireEvent, screen } from 'expo-router/testing-library';
import { Alert, Text } from 'react-native';

import { ErroApi } from '../services/api/erro';
import type { Contato } from '../services/api/types';
import { criarAuthApiMock, criarContatosApiMock, montarTela } from '../test-utils/montar-tela';
import { TelaFormularioContato } from './TelaFormularioContato';

// O Ionicons tenta carregar um arquivo de fonte (que nao existe no Jest); o icone e decorativo.
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

afterEach(() => jest.restoreAllMocks());

// Como o Java devolve: telefone normalizado com +55 e parentesco opcional.
const marina: Contato = {
  id: 3,
  nome: 'Marina Souza',
  parentesco: 'filha',
  telefone: '+5511988887777',
  prioridade: 2,
};

function InicioFalso() {
  return <Text>Início de mentira</Text>;
}

function ListaFalsa() {
  return <Text>Lista de mentira</Text>;
}

async function montar(
  url: string,
  configurar: (api: ReturnType<typeof criarContatosApiMock>) => void = () => {},
) {
  const contatos = criarContatosApiMock();
  configurar(contatos);
  await montarTela(InicioFalso, {
    auth: criarAuthApiMock(),
    contatos,
    rotas: {
      contatos: ListaFalsa,
      'contatos/novo': TelaFormularioContato,
      'contatos/[id]': TelaFormularioContato,
    },
    url,
  });
  return contatos;
}

async function preencher(rotulo: string, texto: string) {
  await fireEvent.changeText(screen.getByLabelText(rotulo), texto);
}

describe('TelaFormularioContato: novo contato', () => {
  it('mostra o titulo e os campos vazios, sem botao de excluir', async () => {
    await montar('/contatos/novo');
    expect(await screen.findByRole('header', { name: 'Novo contato' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Nome')).toHaveProp('value', '');
    expect(screen.getByLabelText('Parentesco (opcional)')).toHaveProp('value', '');
    expect(screen.queryByRole('button', { name: 'Excluir contato' })).not.toBeOnTheScreen();
  });

  it('oferece prioridade de 1 a 10, com a 1 marcada', async () => {
    await montar('/contatos/novo');
    await screen.findByRole('header', { name: 'Novo contato' });
    for (let n = 1; n <= 10; n++) {
      expect(screen.getByRole('radio', { name: String(n) })).toBeOnTheScreen();
    }
    expect(screen.getByRole('radio', { name: '1' })).toBeSelected();
  });

  it('coloca a mascara no telefone enquanto a pessoa digita', async () => {
    await montar('/contatos/novo');
    await preencher('Telefone', '11988887777');
    expect(screen.getByLabelText('Telefone')).toHaveProp('value', '(11) 98888-7777');
  });

  it('com dados invalidos, mostra os erros e nao chama a API', async () => {
    const contatos = await montar('/contatos/novo');
    await screen.findByRole('header', { name: 'Novo contato' });

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar contato' }));

    expect(await screen.findByText(/O nome deve ter/)).toBeOnTheScreen();
    expect(screen.getByText(/Digite o telefone com DDD/)).toBeOnTheScreen();
    expect(contatos.criar).not.toHaveBeenCalled();
  });

  it('cria o contato com os dados limpos e volta para a lista', async () => {
    const contatos = await montar('/contatos/novo', (api) => api.criar.mockResolvedValue(marina));
    await screen.findByRole('header', { name: 'Novo contato' });
    await preencher('Nome', '  Marina Souza ');
    await preencher('Parentesco (opcional)', ' filha ');
    await preencher('Telefone', '11988887777');
    await fireEvent.press(screen.getByRole('radio', { name: '2' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar contato' }));

    expect(await screen.findByText('Lista de mentira')).toBeOnTheScreen();
    expect(contatos.criar).toHaveBeenCalledWith({
      nome: 'Marina Souza',
      parentesco: 'filha',
      telefone: '11988887777',
      prioridade: 2,
    });
  });

  it('parentesco em branco vai como null (e opcional no Java)', async () => {
    const contatos = await montar('/contatos/novo', (api) => api.criar.mockResolvedValue(marina));
    await screen.findByRole('header', { name: 'Novo contato' });
    await preencher('Nome', 'Dra. Helena');
    await preencher('Parentesco (opcional)', '   ');
    await preencher('Telefone', '1133334444');

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar contato' }));

    await screen.findByText('Lista de mentira');
    expect(contatos.criar).toHaveBeenCalledWith({
      nome: 'Dra. Helena',
      parentesco: null,
      telefone: '1133334444',
      prioridade: 1,
    });
  });

  it('se a API recusar, mostra o erro do campo e diz que nao foi salvo', async () => {
    await montar('/contatos/novo', (api) =>
      api.criar.mockRejectedValue(new ErroApi(400, 'x', { telefone: 'Telefone inválido.' })),
    );
    await screen.findByRole('header', { name: 'Novo contato' });
    await preencher('Nome', 'Marina Souza');
    await preencher('Telefone', '11988887777');

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar contato' }));

    expect(await screen.findByText('Telefone inválido.')).toBeOnTheScreen();
    expect(screen.getByText('Confira os dados do contato. Ele não foi salvo.')).toBeOnTheScreen();
  });

  it('com 10 contatos, explica o limite e diz que nao foi salvo', async () => {
    await montar('/contatos/novo', (api) => api.criar.mockRejectedValue(new ErroApi(409, 'x')));
    await screen.findByRole('header', { name: 'Novo contato' });
    await preencher('Nome', 'Marina Souza');
    await preencher('Telefone', '11988887777');

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar contato' }));

    expect(
      await screen.findByText(
        'Você já tem 10 contatos. Exclua um para adicionar outro. O contato não foi salvo.',
      ),
    ).toBeOnTheScreen();
  });

  it('sem conexao, diz que o contato nao foi salvo e mantem o que foi digitado', async () => {
    await montar('/contatos/novo', (api) =>
      api.criar.mockRejectedValue(new ErroApi(0, 'sem rede')),
    );
    await screen.findByRole('header', { name: 'Novo contato' });
    await preencher('Nome', 'Marina Souza');
    await preencher('Telefone', '11988887777');

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar contato' }));

    expect(
      await screen.findByText('Sem conexão. O contato não foi salvo. Tente de novo.'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Nome')).toHaveProp('value', 'Marina Souza');
  });
});

describe('TelaFormularioContato: editar contato', () => {
  it('carrega o contato e preenche os campos', async () => {
    const contatos = await montar('/contatos/3', (api) => api.obter.mockResolvedValue(marina));

    expect(await screen.findByRole('header', { name: 'Editar contato' })).toBeOnTheScreen();
    expect(await screen.findByDisplayValue('Marina Souza')).toBeOnTheScreen();
    expect(screen.getByLabelText('Parentesco (opcional)')).toHaveProp('value', 'filha');
    expect(screen.getByLabelText('Telefone')).toHaveProp('value', '(11) 98888-7777');
    expect(screen.getByRole('radio', { name: '2' })).toBeSelected();
    expect(contatos.obter).toHaveBeenCalledWith(3);
  });

  it('contato sem parentesco abre com o campo vazio', async () => {
    await montar('/contatos/3', (api) =>
      api.obter.mockResolvedValue({ ...marina, parentesco: null }),
    );
    await screen.findByDisplayValue('Marina Souza');
    expect(screen.getByLabelText('Parentesco (opcional)')).toHaveProp('value', '');
  });

  it('salva as mudancas com PUT e volta para a lista', async () => {
    const contatos = await montar('/contatos/3', (api) => {
      api.obter.mockResolvedValue(marina);
      api.editar.mockResolvedValue({ ...marina, parentesco: 'filhota' });
    });
    await screen.findByDisplayValue('Marina Souza');
    await preencher('Parentesco (opcional)', 'filhota');

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar contato' }));

    expect(await screen.findByText('Lista de mentira')).toBeOnTheScreen();
    expect(contatos.editar).toHaveBeenCalledWith(3, {
      nome: 'Marina Souza',
      parentesco: 'filhota',
      telefone: '11988887777',
      prioridade: 2,
    });
  });

  it('contato que nao existe: avisa e nao mostra o formulario', async () => {
    await montar('/contatos/99', (api) => api.obter.mockRejectedValue(new ErroApi(404, 'x')));
    expect(await screen.findByText('Contato não encontrado.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Salvar contato' })).not.toBeOnTheScreen();
  });

  it('se nao conseguir carregar, deixa tentar de novo', async () => {
    const contatos = await montar('/contatos/3', (api) =>
      api.obter.mockRejectedValueOnce(new ErroApi(0, 'x')).mockResolvedValueOnce(marina),
    );
    expect(
      await screen.findByText('Sem conexão. Verifique a internet e tente de novo.'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByDisplayValue('Marina Souza')).toBeOnTheScreen();
    expect(contatos.obter).toHaveBeenCalledTimes(2);
  });

  describe('excluir', () => {
    it('pergunta antes e so exclui se a pessoa confirmar', async () => {
      const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const contatos = await montar('/contatos/3', (api) => {
        api.obter.mockResolvedValue(marina);
        api.excluir.mockResolvedValue(undefined);
      });
      await screen.findByDisplayValue('Marina Souza');

      await fireEvent.press(screen.getByRole('button', { name: 'Excluir contato' }));

      expect(contatos.excluir).not.toHaveBeenCalled();
      const botoes = alerta.mock.calls[0][2] as {
        text: string;
        style?: string;
        onPress?: () => void;
      }[];
      expect(botoes.map((b) => b.text)).toEqual(['Voltar', 'Excluir contato']);
      expect(botoes[0].style).toBe('cancel');
      expect(botoes[1].style).toBe('destructive');

      botoes[1].onPress?.();

      expect(await screen.findByText('Lista de mentira')).toBeOnTheScreen();
      expect(contatos.excluir).toHaveBeenCalledWith(3);
    });

    it('se falhar, diz que o contato nao foi excluido e continua na tela', async () => {
      const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      await montar('/contatos/3', (api) => {
        api.obter.mockResolvedValue(marina);
        api.excluir.mockRejectedValue(new ErroApi(0, 'sem rede'));
      });
      await screen.findByDisplayValue('Marina Souza');
      await fireEvent.press(screen.getByRole('button', { name: 'Excluir contato' }));
      const botoes = alerta.mock.calls[0][2] as { text: string; onPress?: () => void }[];

      botoes[1].onPress?.();

      expect(
        await screen.findByText('Sem conexão. O contato não foi excluído. Tente de novo.'),
      ).toBeOnTheScreen();
      expect(screen.getByLabelText('Nome')).toHaveProp('value', 'Marina Souza');
    });
  });
});
