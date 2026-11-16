import { type Href, router, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Alert, Linking, Text } from 'react-native';

import { Botao } from '../components/Botao';
import { ErroApi } from '../services/api/erro';
import type { Contato, Pagina, PerfilEmergencia } from '../services/api/types';
import {
  criarArmazenamentoEmMemoria,
  criarAuthApiMock,
  criarContatosApiMock,
  criarPerfisApiMock,
  montarTela,
  sessaoDeTeste,
} from '../test-utils/montar-tela';
import { TelaContatos } from './TelaContatos';

// O Ionicons tenta carregar um arquivo de fonte (que nao existe no Jest); o icone e decorativo.
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

beforeEach(() => {
  perfisDoTeste = criarPerfisApiMock();
  perfisDoTeste.meu.mockResolvedValue(perfilExistente);
});

afterEach(() => jest.restoreAllMocks());

function contato(id: number, extras: Partial<Contato> = {}): Contato {
  return {
    id,
    nome: `Pessoa ${id}`,
    parentesco: `parentesco${id}`,
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

// Outra tela de mentira, aberta por cima da lista: deixa voltar, para testar o recarregamento da
// lista quando ela volta ao foco.
function OutraTelaFalsa() {
  const router = useRouter();
  return (
    <>
      <Text>Destino outra tela</Text>
      <Botao titulo="Voltar falso" onPress={() => router.back()} />
    </>
  );
}

// "contatos/outra" so existe neste teste (o app nao tem mais tela por cima da lista), por isso o
// tipo de rota e forcado com "as Href".
function abrirOutraTela() {
  router.push('/contatos/outra' as Href);
}

// A tela e montada em /contatos (e nao no "index"), para "voltar" cair no Início falso.
const perfilExistente: PerfilEmergencia = {
  id: 5,
  mobilidade: 'NAO_INFORMADO',
  condicoesSaude: null,
  medicamentos: null,
  observacoes: null,
};

// Por padrao a pessoa ja tem perfil; os testes de "sem perfil" trocam o mock de meu().
let perfisDoTeste = criarPerfisApiMock();

async function montar(configurar: (api: ReturnType<typeof criarContatosApiMock>) => void) {
  const contatos = criarContatosApiMock();
  configurar(contatos);
  await montarTela(InicioFalso, {
    auth: criarAuthApiMock(),
    contatos,
    perfis: perfisDoTeste,
    rotas: {
      // Stack de verdade (como no app): a lista continua montada enquanto outra tela abre por cima.
      'contatos/_layout': () => <Stack screenOptions={{ headerShown: false }} />,
      'contatos/index': TelaContatos,
      'contatos/outra': OutraTelaFalsa,
      perfil: () => <Text>Tela do perfil de mentira</Text>,
      'contatos/novo': () => <Text>Formulário de mentira: novo</Text>,
      'contatos/[id]': FormularioDeEdicaoFalso,
    },
    url: '/contatos',
  });
  return contatos;
}

function FormularioDeEdicaoFalso() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Text>{`Formulário de mentira: editar ${id}`}</Text>;
}

describe('TelaContatos', () => {
  describe('perfil de emergencia', () => {
    it('sem perfil, oferece "Criar meu perfil de emergencia" e esconde "Novo contato"', async () => {
      perfisDoTeste.meu.mockResolvedValue(null);
      await montar((api) => api.listar.mockResolvedValue(pagina([], 1, 0)));

      expect(
        await screen.findByRole('button', { name: 'Criar meu perfil de emergência' }),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(/Para cadastrar contatos, crie primeiro seu perfil/),
      ).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Novo contato' })).not.toBeOnTheScreen();
      expect(screen.queryByText(/Você ainda não tem contatos/)).not.toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Meu perfil' })).not.toBeOnTheScreen();
    });

    it('o botao "Criar meu perfil" abre a tela do perfil', async () => {
      perfisDoTeste.meu.mockResolvedValue(null);
      await montar((api) => api.listar.mockResolvedValue(pagina([], 1, 0)));

      await fireEvent.press(
        await screen.findByRole('button', { name: 'Criar meu perfil de emergência' }),
      );

      expect(await screen.findByText('Tela do perfil de mentira')).toBeOnTheScreen();
    });

    it('com perfil mas sem contatos, mostra o aviso de lista vazia, "Novo contato" e "Meu perfil"', async () => {
      await montar((api) => api.listar.mockResolvedValue(pagina([], 1, 0)));

      expect(
        await screen.findByText('Você ainda não tem contatos de emergência cadastrados.'),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Novo contato' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Meu perfil' })).toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: 'Criar meu perfil de emergência' }),
      ).not.toBeOnTheScreen();
    });

    it('com contatos, ja sabe que ha perfil: mostra "Meu perfil" sem consultar o perfil', async () => {
      await montar((api) => api.listar.mockResolvedValue(pagina([contato(1)], 1, 1)));

      await fireEvent.press(await screen.findByRole('button', { name: 'Meu perfil' }));

      expect(await screen.findByText('Tela do perfil de mentira')).toBeOnTheScreen();
      expect(perfisDoTeste.meu).not.toHaveBeenCalled();
    });

    it('se nao conseguir saber do perfil, avisa e deixa tentar de novo', async () => {
      perfisDoTeste.meu
        .mockRejectedValueOnce(new ErroApi(0, 'sem rede'))
        .mockResolvedValueOnce(null);
      await montar((api) => api.listar.mockResolvedValue(pagina([], 1, 0)));

      expect(
        await screen.findByText('Sem conexão. Verifique a internet e tente de novo.'),
      ).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

      expect(
        await screen.findByRole('button', { name: 'Criar meu perfil de emergência' }),
      ).toBeOnTheScreen();
    });
  });

  it('pede a primeira pagina (10 por vez) e mostra os contatos e o total', async () => {
    const contatos = await montar((api) =>
      api.listar.mockResolvedValue(
        pagina([contato(1, { nome: 'Marina Souza', parentesco: 'filha' }), contato(2)], 1, 2),
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

  it('sem nenhum contato, diz que o cuidador e quem cadastra', async () => {
    await montar((api) => api.listar.mockResolvedValue(pagina([], 1, 0)));
    expect(
      await screen.findByText('Você ainda não tem contatos de emergência cadastrados.'),
    ).toBeOnTheScreen();
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

    expect(await screen.findByText('parentesco1')).toBeOnTheScreen();
    expect(contatos.listar).toHaveBeenCalledTimes(2);
  });

  it('se a API devolver 404, a frase fala de contato (e nao de reporte)', async () => {
    // Visto no simulador contra o Java real: o caminho errado dava "Reporte nao encontrado.".
    await montar((api) => api.listar.mockRejectedValue(new ErroApi(404, 'nao existe')));

    expect(await screen.findByText('Contato não encontrado.')).toBeOnTheScreen();
    expect(screen.queryByText('Reporte não encontrado.')).not.toBeOnTheScreen();
  });

  describe('Ver mais', () => {
    const primeiraPagina = Array.from({ length: 10 }, (_, i) => contato(i + 1));

    it('so aparece quando ainda ha contatos para trazer', async () => {
      await montar((api) => api.listar.mockResolvedValue(pagina([contato(1)], 1, 1)));
      await screen.findByText('parentesco1');
      expect(screen.queryByRole('button', { name: 'Ver mais' })).not.toBeOnTheScreen();
    });

    it('traz a proxima pagina e junta com a lista; some quando acaba', async () => {
      const contatos = await montar((api) =>
        api.listar
          .mockResolvedValueOnce(pagina(primeiraPagina, 1, 12))
          .mockResolvedValueOnce(pagina([contato(11), contato(12)], 2, 12)),
      );
      await screen.findByText('parentesco1');

      await fireEvent.press(screen.getByRole('button', { name: 'Ver mais' }));

      expect(await screen.findByText('parentesco12')).toBeOnTheScreen();
      expect(screen.getByText('parentesco1')).toBeOnTheScreen();
      expect(contatos.listar).toHaveBeenLastCalledWith(2, 10);
      expect(screen.queryByRole('button', { name: 'Ver mais' })).not.toBeOnTheScreen();
    });

    it('nao repete um contato que ja esta na lista', async () => {
      await montar((api) =>
        api.listar
          .mockResolvedValueOnce(pagina(primeiraPagina, 1, 12))
          .mockResolvedValueOnce(pagina([contato(10), contato(11), contato(12)], 2, 12)),
      );
      await screen.findByText('parentesco1');

      await fireEvent.press(screen.getByRole('button', { name: 'Ver mais' }));

      await screen.findByText('parentesco12');
      expect(screen.getAllByText('parentesco10')).toHaveLength(1);
    });

    it('se falhar, mantem a lista, avisa e deixa tentar de novo', async () => {
      await montar((api) =>
        api.listar
          .mockResolvedValueOnce(pagina(primeiraPagina, 1, 12))
          .mockRejectedValueOnce(new ErroApi(0, 'sem rede'))
          .mockResolvedValueOnce(pagina([contato(11), contato(12)], 2, 12)),
      );
      await screen.findByText('parentesco1');

      await fireEvent.press(screen.getByRole('button', { name: 'Ver mais' }));
      expect(
        await screen.findByText('Sem conexão. Verifique a internet e tente de novo.'),
      ).toBeOnTheScreen();
      expect(screen.getByText('parentesco1')).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Ver mais' }));
      expect(await screen.findByText('parentesco12')).toBeOnTheScreen();
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
    await screen.findByText('parentesco1');
    await fireEvent.press(screen.getByRole('button', { name: 'Ver mais' }));
    await act(async () => abrirOutraTela());
    await screen.findByText('Destino outra tela');

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar falso' }));
    expect(await screen.findByText('1 contato')).toBeOnTheScreen();
    await act(async () => {
      responderAntiga(pagina([contato(11), contato(12)], 2, 12));
    });

    expect(screen.queryByText('parentesco12')).not.toBeOnTheScreen();
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
    await screen.findByText('parentesco1');
    await fireEvent.press(screen.getByRole('button', { name: 'Ver mais' }));
    await act(async () => abrirOutraTela());
    await screen.findByText('Destino outra tela');

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
    await screen.findByText('parentesco1');
    await fireEvent.press(screen.getByRole('button', { name: 'Ver mais' }));
    await act(async () => abrirOutraTela());
    await screen.findByText('Destino outra tela');

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
        pagina([contato(1, { nome: 'Marina Souza', parentesco: 'filha' })], 1, 1),
      ),
    );
    await screen.findByText('filha');

    await fireEvent.press(screen.getByRole('button', { name: 'Ligar para Marina Souza, filha' }));

    expect(abrir).toHaveBeenCalledWith('tel:11988887777');
  });

  it('contato sem parentesco (opcional no Java): mostra so o nome e o botao Ligar sem virgula solta', async () => {
    await montar((api) =>
      api.listar.mockResolvedValue(
        pagina([contato(1, { nome: 'Dra. Helena', parentesco: null })], 1, 1),
      ),
    );

    expect(await screen.findByText('Dra. Helena')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ligar para Dra. Helena' })).toBeOnTheScreen();
  });

  describe('o cidadao gere os proprios contatos (liberado no Java em 16/11/2026)', () => {
    it('o botao "Novo contato" abre o formulario de criacao', async () => {
      await montar((api) => api.listar.mockResolvedValue(pagina([contato(1)], 1, 1)));
      await screen.findByText('Pessoa 1');

      await fireEvent.press(screen.getByRole('button', { name: 'Novo contato' }));

      expect(await screen.findByText('Formulário de mentira: novo')).toBeOnTheScreen();
    });

    it('cada contato tem um botao "Editar" que abre o formulario daquele contato', async () => {
      await montar((api) =>
        api.listar.mockResolvedValue(pagina([contato(1), contato(2, { nome: 'Carlos' })], 1, 2)),
      );
      await screen.findByText('Carlos');

      await fireEvent.press(screen.getByRole('button', { name: 'Editar Carlos, parentesco2' }));

      expect(await screen.findByText('Formulário de mentira: editar 2')).toBeOnTheScreen();
    });

    it('sem nenhum contato, ainda oferece "Novo contato"', async () => {
      await montar((api) => api.listar.mockResolvedValue(pagina([], 1, 0)));
      await screen.findByText('Você ainda não tem contatos de emergência cadastrados.');
      expect(screen.getByRole('button', { name: 'Novo contato' })).toBeOnTheScreen();
    });

    it('com 10 contatos (o maximo do Java), esconde "Novo contato" e explica', async () => {
      const dez = Array.from({ length: 10 }, (_, i) => contato(i + 1));
      await montar((api) => api.listar.mockResolvedValue(pagina(dez, 1, 10)));
      await screen.findByText('10 contatos');

      expect(screen.queryByRole('button', { name: 'Novo contato' })).not.toBeOnTheScreen();
      expect(
        screen.getByText('Você já tem 10 contatos. Exclua um para adicionar outro.'),
      ).toBeOnTheScreen();
    });
  });

  // No Java, GET /perfis-emergencia/meu e so do CIDADAO (403 para o cuidador): chama-lo mostraria
  // um erro. O cuidador ve um aviso e a API de contatos nem e consultada.
  it('para o cuidador, explica a tela e nao consulta a API de contatos', async () => {
    const contatos = criarContatosApiMock();
    await montarTela(InicioFalso, {
      auth: criarAuthApiMock(),
      contatos,
      armazenamento: criarArmazenamentoEmMemoria({
        ...sessaoDeTeste,
        usuario: { ...sessaoDeTeste.usuario, role: 'CUIDADOR' },
      }),
      rotas: { 'contatos/index': TelaContatos },
      url: '/contatos',
    });

    expect(
      await screen.findByText(/Esta tela mostra os contatos de quem usa o app como cidadão/),
    ).toBeOnTheScreen();
    expect(contatos.listar).not.toHaveBeenCalled();
    expect(screen.queryByText('Carregando contatos…')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeOnTheScreen();
  });

  it('Voltar leva para o Início', async () => {
    await montar((api) => api.listar.mockResolvedValue(pagina([], 1, 0)));
    await screen.findByText('Você ainda não tem contatos de emergência cadastrados.');

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    expect(await screen.findByText('Início de mentira')).toBeOnTheScreen();
  });
});
