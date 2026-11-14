import { Stack, useRouter } from 'expo-router';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Alert, Linking, Text } from 'react-native';

import { Botao } from '../components/Botao';
import { ErroApi } from '../services/api/erro';
import type { Contato, Pagina } from '../services/api/types';
import { criarAuthApiMock, criarContatosApiMock, montarTela } from '../test-utils/montar-tela';
import { TelaContatos } from './TelaContatos';

// O Ionicons tenta carregar um arquivo de fonte (que nao existe no Jest); o icone e decorativo.
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

afterEach(() => jest.restoreAllMocks());

function contato(id: number, extras: Partial<Contato> = {}): Contato {
  return {
    id,
    nome: `Pessoa ${id}`,
    apelido: `apelido${id}`,
    telefone: '11988887777',
    prioridade: 1,
    ...extras,
  };
}

function pagina(itens: Contato[], numero: number, total: number): Pagina<Contato> {
  return { itens, pagina: numero, tamanho: 10, total };
}

function InicioFalso() {
  return <Text>Início de mentira</Text>;
}

// Destino de mentira do "Editar": deixa voltar, para testar o recarregamento da lista.
function EditarFalso() {
  const router = useRouter();
  return (
    <>
      <Text>Destino editar contato</Text>
      <Botao titulo="Voltar falso" onPress={() => router.back()} />
    </>
  );
}

// A tela e montada em /contatos (e nao no "index"), para "voltar" cair no Início falso.
async function montar(configurar: (api: ReturnType<typeof criarContatosApiMock>) => void) {
  const contatos = criarContatosApiMock();
  configurar(contatos);
  await montarTela(InicioFalso, {
    auth: criarAuthApiMock(),
    contatos,
    rotas: {
      // Stack de verdade (como no app): a lista continua montada enquanto outra tela abre por cima.
      'contatos/_layout': () => <Stack screenOptions={{ headerShown: false }} />,
      'contatos/index': TelaContatos,
      'contatos/novo': () => <Text>Destino novo contato</Text>,
      'contatos/[id]': EditarFalso,
    },
    url: '/contatos',
  });
  return contatos;
}

describe('TelaContatos', () => {
  it('pede a primeira pagina (10 por vez) e mostra os contatos e o total', async () => {
    const contatos = await montar((api) =>
      api.listar.mockResolvedValue(
        pagina([contato(1, { nome: 'Marina Souza', apelido: 'filha' }), contato(2)], 1, 2),
      ),
    );

    expect(await screen.findByRole('header', { name: 'Contatos de emergência' })).toBeOnTheScreen();
    expect(await screen.findByText('filha')).toBeOnTheScreen();
    expect(screen.getByText('Marina Souza')).toBeOnTheScreen();
    expect(screen.getAllByText('(11) 98888-7777')).toHaveLength(2);
    expect(screen.getByText('2 contatos')).toBeOnTheScreen();
    expect(contatos.listar).toHaveBeenCalledWith(1, 10);
  });

  it('com um contato so, o total fica no singular', async () => {
    await montar((api) => api.listar.mockResolvedValue(pagina([contato(1)], 1, 1)));
    expect(await screen.findByText('1 contato')).toBeOnTheScreen();
  });

  it('enquanto carrega, avisa que esta carregando', async () => {
    await montar((api) => api.listar.mockReturnValue(new Promise(() => {})));
    expect(await screen.findByText('Carregando contatos…')).toBeOnTheScreen();
  });

  it('sem nenhum contato, explica para que servem', async () => {
    await montar((api) => api.listar.mockResolvedValue(pagina([], 1, 0)));
    expect(await screen.findByText('Você ainda não cadastrou nenhum contato.')).toBeOnTheScreen();
  });

  it('se nao conseguir carregar, avisa e deixa tentar de novo', async () => {
    const contatos = await montar((api) =>
      api.listar
        .mockRejectedValueOnce(new ErroApi(0, 'sem rede'))
        .mockResolvedValueOnce(pagina([contato(1)], 1, 1)),
    );

    expect(
      await screen.findByText('Sem conexão. Verifique a internet e tente de novo.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByText('apelido1')).toBeOnTheScreen();
    expect(contatos.listar).toHaveBeenCalledTimes(2);
  });

  describe('Ver mais', () => {
    const primeiraPagina = Array.from({ length: 10 }, (_, i) => contato(i + 1));

    it('so aparece quando ainda ha contatos para trazer', async () => {
      await montar((api) => api.listar.mockResolvedValue(pagina([contato(1)], 1, 1)));
      await screen.findByText('apelido1');
      expect(screen.queryByRole('button', { name: 'Ver mais' })).not.toBeOnTheScreen();
    });

    it('traz a proxima pagina e junta com a lista; some quando acaba', async () => {
      const contatos = await montar((api) =>
        api.listar
          .mockResolvedValueOnce(pagina(primeiraPagina, 1, 12))
          .mockResolvedValueOnce(pagina([contato(11), contato(12)], 2, 12)),
      );
      await screen.findByText('apelido1');

      await fireEvent.press(screen.getByRole('button', { name: 'Ver mais' }));

      expect(await screen.findByText('apelido12')).toBeOnTheScreen();
      expect(screen.getByText('apelido1')).toBeOnTheScreen();
      expect(contatos.listar).toHaveBeenLastCalledWith(2, 10);
      expect(screen.queryByRole('button', { name: 'Ver mais' })).not.toBeOnTheScreen();
    });

    it('nao repete um contato que ja esta na lista', async () => {
      await montar((api) =>
        api.listar
          .mockResolvedValueOnce(pagina(primeiraPagina, 1, 12))
          .mockResolvedValueOnce(pagina([contato(10), contato(11), contato(12)], 2, 12)),
      );
      await screen.findByText('apelido1');

      await fireEvent.press(screen.getByRole('button', { name: 'Ver mais' }));

      await screen.findByText('apelido12');
      expect(screen.getAllByText('apelido10')).toHaveLength(1);
    });

    it('se falhar, mantem a lista, avisa e deixa tentar de novo', async () => {
      await montar((api) =>
        api.listar
          .mockResolvedValueOnce(pagina(primeiraPagina, 1, 12))
          .mockRejectedValueOnce(new ErroApi(0, 'sem rede'))
          .mockResolvedValueOnce(pagina([contato(11), contato(12)], 2, 12)),
      );
      await screen.findByText('apelido1');

      await fireEvent.press(screen.getByRole('button', { name: 'Ver mais' }));
      expect(
        await screen.findByText('Sem conexão. Verifique a internet e tente de novo.'),
      ).toBeOnTheScreen();
      expect(screen.getByText('apelido1')).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Ver mais' }));
      expect(await screen.findByText('apelido12')).toBeOnTheScreen();
    });
  });

  it('ignora a resposta atrasada do "Ver mais" depois que a lista foi recarregada', async () => {
    // Cenario: "Ver mais" fica pendente, a pessoa edita/exclui um contato e volta para a lista
    // (que recarrega). Se a resposta antiga chegar depois, nao pode desfazer a lista nova.
    let responderAntiga: (p: Pagina<Contato>) => void = () => {};
    const antiga = new Promise<Pagina<Contato>>((resolve) => {
      responderAntiga = resolve;
    });
    const primeiraPagina = Array.from({ length: 10 }, (_, i) => contato(i + 1));
    const contatos = await montar((api) =>
      api.listar
        .mockResolvedValueOnce(pagina(primeiraPagina, 1, 12))
        .mockReturnValueOnce(antiga)
        .mockResolvedValueOnce(pagina([contato(1)], 1, 1)),
    );
    await screen.findByText('apelido1');
    await fireEvent.press(screen.getByRole('button', { name: 'Ver mais' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Editar apelido1, Pessoa 1' }));
    await screen.findByText('Destino editar contato');

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar falso' }));
    expect(await screen.findByText('1 contato')).toBeOnTheScreen();
    await act(async () => {
      responderAntiga(pagina([contato(11), contato(12)], 2, 12));
    });

    expect(screen.queryByText('apelido12')).not.toBeOnTheScreen();
    expect(screen.getByText('1 contato')).toBeOnTheScreen();
    expect(contatos.listar).toHaveBeenCalledTimes(3);
  });

  it('se a recarga falhar com um "Ver mais" invalidado, o botao nao fica travado carregando', async () => {
    // O "Ver mais" pendente deixa de valer quando a lista recarrega; se a recarga falhar, nada
    // mais limparia o indicador dele, e o botao ficaria desabilitado e girando para sempre.
    const primeiraPagina = Array.from({ length: 10 }, (_, i) => contato(i + 1));
    await montar((api) =>
      api.listar
        .mockResolvedValueOnce(pagina(primeiraPagina, 1, 12))
        .mockReturnValueOnce(new Promise(() => {}))
        .mockRejectedValueOnce(new ErroApi(0, 'sem rede')),
    );
    await screen.findByText('apelido1');
    await fireEvent.press(screen.getByRole('button', { name: 'Ver mais' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Editar apelido1, Pessoa 1' }));
    await screen.findByText('Destino editar contato');

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar falso' }));

    expect(
      await screen.findByText('Sem conexão. Verifique a internet e tente de novo.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ver mais' })).toBeEnabled();
  });

  it('mantem o "Ver mais" desabilitado enquanto a lista recarrega', async () => {
    // Um "Ver mais" feito durante a recarga nasceria com a lista antiga e, ao chegar depois dela,
    // a sobrescreveria com dados velhos; por isso o botao espera a recarga terminar.
    let terminarRecarga: (p: Pagina<Contato>) => void = () => {};
    const recarga = new Promise<Pagina<Contato>>((resolve) => {
      terminarRecarga = resolve;
    });
    const primeiraPagina = Array.from({ length: 10 }, (_, i) => contato(i + 1));
    const contatos = await montar((api) =>
      api.listar
        .mockResolvedValueOnce(pagina(primeiraPagina, 1, 12))
        .mockReturnValueOnce(new Promise(() => {}))
        .mockReturnValueOnce(recarga),
    );
    await screen.findByText('apelido1');
    await fireEvent.press(screen.getByRole('button', { name: 'Ver mais' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Editar apelido1, Pessoa 1' }));
    await screen.findByText('Destino editar contato');

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar falso' }));
    await waitFor(() => expect(contatos.listar).toHaveBeenCalledTimes(3));
    expect(screen.getByRole('button', { name: 'Ver mais' })).toBeDisabled();

    await act(async () => {
      terminarRecarga(pagina(primeiraPagina, 1, 12));
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ver mais' })).toBeEnabled());
  });

  it('o botao Ligar abre o discador com o numero do contato', async () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await montar((api) =>
      api.listar.mockResolvedValue(
        pagina([contato(1, { nome: 'Marina Souza', apelido: 'filha' })], 1, 1),
      ),
    );
    await screen.findByText('filha');

    await fireEvent.press(screen.getByRole('button', { name: 'Ligar para filha, Marina Souza' }));

    expect(abrir).toHaveBeenCalledWith('tel:11988887777');
  });

  it('Adicionar contato abre o formulario de novo contato', async () => {
    await montar((api) => api.listar.mockResolvedValue(pagina([], 1, 0)));
    await screen.findByText('Você ainda não cadastrou nenhum contato.');

    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar contato' }));

    expect(await screen.findByText('Destino novo contato')).toBeOnTheScreen();
  });

  it('Editar abre o formulario daquele contato', async () => {
    await montar((api) =>
      api.listar.mockResolvedValue(
        pagina([contato(1, { nome: 'Marina Souza', apelido: 'filha' })], 1, 1),
      ),
    );
    await screen.findByText('filha');

    await fireEvent.press(screen.getByRole('button', { name: 'Editar filha, Marina Souza' }));

    expect(await screen.findByText('Destino editar contato')).toBeOnTheScreen();
  });

  it('Voltar leva para o Início', async () => {
    await montar((api) => api.listar.mockResolvedValue(pagina([], 1, 0)));
    await screen.findByText('Você ainda não cadastrou nenhum contato.');

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    expect(await screen.findByText('Início de mentira')).toBeOnTheScreen();
  });
});
