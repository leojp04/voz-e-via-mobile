// Auditoria de acessibilidade das telas de reportes e do perfil de emergencia. Aqui monta-se cada
// tela e passa-se o "robo" de test-utils/auditar-acessibilidade (as demais telas estao em
// acessibilidade-telas-restantes.test.tsx).

import { render } from '@testing-library/react-native';
import { screen } from 'expo-router/testing-library';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';

import { auditar } from '../test-utils/auditar-acessibilidade';
import {
  criarAuthApiMock,
  criarPerfisApiMock,
  criarReportesApiMock,
  montarTela,
} from '../test-utils/montar-tela';
import type { PerfilEmergencia, Reporte, ReporteResumo } from '../services/api/types';
import { TelaDetalheReporte } from './TelaDetalheReporte';
import { TelaEditarReporte } from './TelaEditarReporte';
import { TelaMeusReportes } from './TelaMeusReportes';
import { TelaNovoReporte } from './TelaNovoReporte';
import { TelaPerfil } from './TelaPerfil';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../services/aparelho/camera', () => ({
  tirarFoto: jest.fn(),
  escolherFotoDaGaleria: jest.fn(),
}));
jest.mock('../services/aparelho/localizacao', () => ({ obterLocalizacao: jest.fn() }));

const CATEGORIA = { id: 3, codigo: 'BURACO', nome: 'Buraco na rua' };
const CRIADO_EM = '2026-11-13T12:00:00.000Z';

const RESUMO: ReporteResumo = {
  id: 7,
  protocolo: 'VV-2026-000007',
  categoria: CATEGORIA,
  descricao: 'Buraco grande na frente do número 80.',
  urgencia: 'ALTA',
  status: 'EM_ANALISE',
  criadoEm: CRIADO_EM,
};

const REPORTE: Reporte = {
  ...RESUMO,
  latitude: -23.5505,
  longitude: -46.6333,
  endereco: 'Praça João Kaiser, 40 - Sé, São Paulo',
  fotoUrl: 'https://fotos.exemplo/7.jpg',
  atualizadoEm: CRIADO_EM,
  historico: [{ statusAnterior: null, statusNovo: 'ABERTO', criadoEm: CRIADO_EM }],
};

const PERFIL: PerfilEmergencia = {
  id: 5,
  mobilidade: 'BENGALA',
  condicoesSaude: 'Diabetes',
  medicamentos: 'Insulina',
  observacoes: 'Moro no 3º andar',
};

const raiz = () => screen.root as unknown as ReactTestInstance;

describe('acessibilidade das telas novas', () => {
  beforeEach(() => jest.clearAllMocks());

  it('Meus reportes (lista com itens)', async () => {
    const reportes = criarReportesApiMock();
    reportes.listarMeus.mockResolvedValue({ itens: [RESUMO], pagina: 1, tamanho: 10, total: 25 });
    await montarTela(TelaMeusReportes, { auth: criarAuthApiMock(), reportes });
    await screen.findByText(RESUMO.descricao);
    expect(auditar(raiz())).toEqual([]);
  });

  it('Novo reporte', async () => {
    const reportes = criarReportesApiMock();
    reportes.listarCategorias.mockResolvedValue([CATEGORIA]);
    await montarTela(TelaNovoReporte, { auth: criarAuthApiMock(), reportes });
    await screen.findByRole('radio', { name: CATEGORIA.nome });
    expect(auditar(raiz())).toEqual([]);
  });

  it('Detalhe do reporte', async () => {
    const reportes = criarReportesApiMock();
    reportes.obter.mockResolvedValue(REPORTE);
    await montarTela(() => null, {
      auth: criarAuthApiMock(),
      reportes,
      rotas: { 'reportes/[id]/index': TelaDetalheReporte },
      url: '/reportes/7',
    });
    await screen.findByText(REPORTE.descricao);
    expect(auditar(raiz())).toEqual([]);
  });

  it('Editar reporte', async () => {
    const reportes = criarReportesApiMock();
    reportes.obter.mockResolvedValue(REPORTE);
    await montarTela(() => null, {
      auth: criarAuthApiMock(),
      reportes,
      rotas: { 'reportes/[id]/editar': TelaEditarReporte },
      url: '/reportes/7/editar',
    });
    await screen.findByRole('header', { name: 'Editar reporte' });
    expect(auditar(raiz())).toEqual([]);
  });

  it('Perfil de emergência (existente)', async () => {
    const perfis = criarPerfisApiMock();
    perfis.meu.mockResolvedValue(PERFIL);
    await montarTela(() => null, {
      auth: criarAuthApiMock(),
      perfis,
      rotas: { perfil: TelaPerfil },
      url: '/perfil',
    });
    await screen.findByLabelText('Condições de saúde (opcional)');
    expect(auditar(raiz())).toEqual([]);
  });
});

describe('a propria auditoria', () => {
  it('reprova uma tela mal feita (prova de que ela nao e vazia)', async () => {
    await render(
      <View>
        <Pressable onPress={() => {}} style={{ minHeight: 20 }} />
        <TextInput />
        <Image source={{ uri: 'https://x.test/a.jpg' }} />
        <Text numberOfLines={1}>Texto preso</Text>
      </View>,
    );
    const problemas = auditar(screen.root as unknown as ReactTestInstance);
    expect(problemas.join('\n')).toMatch(/sem accessibilityRole/);
    expect(problemas.join('\n')).toMatch(/sem nome/);
    expect(problemas.join('\n')).toMatch(/alvo de toque/);
    expect(problemas.join('\n')).toMatch(/campo de texto sem accessibilityLabel/);
    expect(problemas.join('\n')).toMatch(/imagem sem accessibilityLabel/);
    expect(problemas.join('\n')).toMatch(/preso em 1 linha/);
  });
});
