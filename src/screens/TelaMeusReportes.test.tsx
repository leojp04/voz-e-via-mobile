import { useRouter } from 'expo-router';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { ErroApi } from '../services/api/erro';
import type { Pagina, ReporteResumo } from '../services/api/types';
import { Botao } from '../components/Botao';
import { criarAuthApiMock, criarReportesApiMock, montarTela } from '../test-utils/montar-tela';
import { TelaMeusReportes } from './TelaMeusReportes';

// O Ionicons tenta carregar um arquivo de fonte (que nao existe no Jest); o icone e decorativo.
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

const CATEGORIA = { id: 3, codigo: 'BURACO', nome: 'Buraco na rua' };

function resumo(id: number, extras: Partial<ReporteResumo> = {}): ReporteResumo {
  return {
    id,
    protocolo: `VV-2026-${String(id).padStart(6, '0')}`,
    categoria: CATEGORIA,
    descricao: `Descricao do reporte numero ${id}.`,
    urgencia: 'MEDIA',
    status: 'ABERTO',
    criadoEm: new Date(2026, 10, 13, 9, id).toISOString(),
    ...extras,
  };
}

function pagina(itens: ReporteResumo[], numero: number, total: number): Pagina<ReporteResumo> {
  return { itens, pagina: numero, tamanho: 10, total };
}

function InicioFalso() {
  return <Text>Início de mentira</Text>;
}

function NovoFalso() {
  return <Text>Destino novo reporte</Text>;
}

// Detalhe de mentira: mostra o id recebido e deixa voltar, para testar o recarregamento da lista.
function DetalheFalso() {
  const router = useRouter();
  return (
    <>
      <Text>Destino detalhe</Text>
      <Botao titulo="Voltar falso" onPress={() => router.back()} />
    </>
  );
}

// A tela e montada em /reportes (e nao no "index"), para "voltar" cair no Início falso.
async function montar(configurar: (api: ReturnType<typeof criarReportesApiMock>) => void) {
  const reportes = criarReportesApiMock();
  configurar(reportes);
  await montarTela(InicioFalso, {
    auth: criarAuthApiMock(),
    reportes,
    rotas: {
      reportes: TelaMeusReportes,
      'reportes/novo': NovoFalso,
      'reportes/[id]': DetalheFalso,
    },
    url: '/reportes',
  });
  return reportes;
}

const cartao = (protocolo: string) => screen.getByRole('button', { name: new RegExp(protocolo) });

describe('TelaMeusReportes', () => {
  it('pede a primeira pagina (10 por vez) e mostra os reportes e o total', async () => {
    const reportes = await montar((api) =>
      api.listarMeus.mockResolvedValue(pagina([resumo(2), resumo(1)], 1, 2)),
    );

    expect(await screen.findByRole('header', { name: 'Meus reportes' })).toBeOnTheScreen();
    expect(await screen.findByText('Descricao do reporte numero 2.')).toBeOnTheScreen();
    expect(screen.getByText('Descricao do reporte numero 1.')).toBeOnTheScreen();
    expect(screen.getByText('2 reportes')).toBeOnTheScreen();
    expect(reportes.listarMeus).toHaveBeenCalledWith(1, 10);
  });

  it('com um reporte so, o total fica no singular', async () => {
    await montar((api) => api.listarMeus.mockResolvedValue(pagina([resumo(1)], 1, 1)));
    expect(await screen.findByText('1 reporte')).toBeOnTheScreen();
  });

  it('enquanto carrega, avisa que esta carregando', async () => {
    await montar((api) => api.listarMeus.mockReturnValue(new Promise(() => {})));
    expect(await screen.findByText('Carregando reportes…')).toBeOnTheScreen();
  });

  it('sem nenhum reporte, explica e oferece fazer o primeiro', async () => {
    await montar((api) => api.listarMeus.mockResolvedValue(pagina([], 1, 0)));
    expect(await screen.findByText('Você ainda não fez nenhum reporte.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Fazer um novo reporte' }));

    expect(await screen.findByText('Destino novo reporte')).toBeOnTheScreen();
  });

  it('se nao conseguir carregar, avisa e deixa tentar de novo', async () => {
    const reportes = await montar((api) =>
      api.listarMeus
        .mockRejectedValueOnce(new ErroApi(0, 'sem rede'))
        .mockResolvedValueOnce(pagina([resumo(1)], 1, 1)),
    );

    expect(
      await screen.findByText('Sem conexão. Verifique a internet e tente de novo.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByText('Descricao do reporte numero 1.')).toBeOnTheScreen();
    expect(reportes.listarMeus).toHaveBeenCalledTimes(2);
  });

  describe('Ver mais', () => {
    const primeiraPagina = Array.from({ length: 10 }, (_, i) => resumo(12 - i));

    it('so aparece quando ainda ha reportes para trazer', async () => {
      await montar((api) => api.listarMeus.mockResolvedValue(pagina([resumo(1)], 1, 1)));
      await screen.findByText('Descricao do reporte numero 1.');
      expect(screen.queryByRole('button', { name: 'Ver mais' })).not.toBeOnTheScreen();
    });

    it('traz a proxima pagina e junta com a lista; some quando acaba', async () => {
      const reportes = await montar((api) =>
        api.listarMeus
          .mockResolvedValueOnce(pagina(primeiraPagina, 1, 12))
          .mockResolvedValueOnce(pagina([resumo(2), resumo(1)], 2, 12)),
      );
      await screen.findByText('Descricao do reporte numero 12.');
      expect(screen.getByText('12 reportes')).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Ver mais' }));

      expect(await screen.findByText('Descricao do reporte numero 1.')).toBeOnTheScreen();
      expect(screen.getByText('Descricao do reporte numero 12.')).toBeOnTheScreen();
      expect(reportes.listarMeus).toHaveBeenLastCalledWith(2, 10);
      expect(screen.queryByRole('button', { name: 'Ver mais' })).not.toBeOnTheScreen();
    });

    it('nao repete um reporte que ja esta na lista (a pagina "anda" se entrar reporte novo)', async () => {
      await montar((api) =>
        api.listarMeus
          .mockResolvedValueOnce(pagina(primeiraPagina, 1, 12))
          .mockResolvedValueOnce(pagina([resumo(3), resumo(2), resumo(1)], 2, 12)),
      );
      await screen.findByText('Descricao do reporte numero 12.');

      await fireEvent.press(screen.getByRole('button', { name: 'Ver mais' }));

      await screen.findByText('Descricao do reporte numero 1.');
      expect(screen.getAllByText('Descricao do reporte numero 3.')).toHaveLength(1);
    });

    it('se falhar, mantem a lista, avisa e deixa tentar de novo', async () => {
      await montar((api) =>
        api.listarMeus
          .mockResolvedValueOnce(pagina(primeiraPagina, 1, 12))
          .mockRejectedValueOnce(new ErroApi(0, 'sem rede'))
          .mockResolvedValueOnce(pagina([resumo(2), resumo(1)], 2, 12)),
      );
      await screen.findByText('Descricao do reporte numero 12.');

      await fireEvent.press(screen.getByRole('button', { name: 'Ver mais' }));
      expect(
        await screen.findByText('Sem conexão. Verifique a internet e tente de novo.'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Descricao do reporte numero 12.')).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Ver mais' }));
      expect(await screen.findByText('Descricao do reporte numero 1.')).toBeOnTheScreen();
    });
  });

  it('tocar num cartao abre o detalhe daquele reporte', async () => {
    await montar((api) => api.listarMeus.mockResolvedValue(pagina([resumo(7)], 1, 1)));
    await screen.findByText('Descricao do reporte numero 7.');

    await fireEvent.press(cartao('VV-2026-000007'));

    expect(await screen.findByText('Destino detalhe')).toBeOnTheScreen();
  });

  it('ao voltar para a lista, ela recarrega (mostra o que mudou la)', async () => {
    const reportes = await montar((api) =>
      api.listarMeus.mockResolvedValue(pagina([resumo(7)], 1, 1)),
    );
    await screen.findByText('Descricao do reporte numero 7.');
    await fireEvent.press(cartao('VV-2026-000007'));
    await screen.findByText('Destino detalhe');
    expect(reportes.listarMeus).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar falso' }));

    await waitFor(() => expect(reportes.listarMeus).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Descricao do reporte numero 7.')).toBeOnTheScreen();
  });

  it('"Fazer um novo reporte" leva ao formulario', async () => {
    await montar((api) => api.listarMeus.mockResolvedValue(pagina([resumo(1)], 1, 1)));
    await screen.findByText('Descricao do reporte numero 1.');

    await fireEvent.press(screen.getByRole('button', { name: 'Fazer um novo reporte' }));

    expect(await screen.findByText('Destino novo reporte')).toBeOnTheScreen();
  });

  it('"Voltar" leva ao Início', async () => {
    await montar((api) => api.listarMeus.mockResolvedValue(pagina([resumo(1)], 1, 1)));
    await screen.findByText('Descricao do reporte numero 1.');

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    expect(await screen.findByText('Início de mentira')).toBeOnTheScreen();
  });
});
