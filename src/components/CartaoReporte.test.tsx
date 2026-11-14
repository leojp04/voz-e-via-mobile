import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { ReporteResumo } from '../services/api/types';
import { ALVO_MINIMO } from '../theme';
import { formatarData } from '../utils/formatar-data';
import { CartaoReporte } from './CartaoReporte';

const reporte: ReporteResumo = {
  id: 7,
  protocolo: 'VV-2026-000007',
  categoria: { id: 3, codigo: 'BURACO', nome: 'Buraco na rua' },
  descricao: 'Buraco grande na frente do número 80, perigoso para quem usa cadeira de rodas.',
  urgencia: 'ALTA',
  status: 'ABERTO',
  criadoEm: new Date(2026, 10, 13, 9, 5).toISOString(),
};

describe('CartaoReporte', () => {
  it('mostra a categoria, o status, a descricao, o protocolo e a data', async () => {
    await render(<CartaoReporte reporte={reporte} aoAbrir={jest.fn()} />);
    expect(screen.getByText('Buraco na rua')).toBeOnTheScreen();
    expect(screen.getByText('Aberto')).toBeOnTheScreen();
    expect(screen.getByText(reporte.descricao)).toBeOnTheScreen();
    expect(
      screen.getByText(`VV-2026-000007 · ${formatarData(reporte.criadoEm)}`),
    ).toBeOnTheScreen();
  });

  it('e um botao que o leitor de tela descreve de uma vez (protocolo, categoria e status)', async () => {
    await render(<CartaoReporte reporte={reporte} aoAbrir={jest.fn()} />);
    expect(
      screen.getByRole('button', { name: 'Reporte VV-2026-000007, Buraco na rua, status Aberto' }),
    ).toBeOnTheScreen();
  });

  it('tocar abre o detalhe', async () => {
    const aoAbrir = jest.fn();
    await render(<CartaoReporte reporte={reporte} aoAbrir={aoAbrir} />);
    await fireEvent.press(screen.getByRole('button', { name: /VV-2026-000007/ }));
    expect(aoAbrir).toHaveBeenCalledTimes(1);
  });

  it('a descricao longa e cortada em 2 linhas para a lista ficar legivel', async () => {
    await render(<CartaoReporte reporte={reporte} aoAbrir={jest.fn()} />);
    expect(screen.getByText(reporte.descricao).props.numberOfLines).toBe(2);
  });

  it('tem area de toque de pelo menos 48 dp', async () => {
    await render(<CartaoReporte reporte={reporte} aoAbrir={jest.fn()} />);
    const estilo = StyleSheet.flatten(
      screen.getByRole('button', { name: /VV-2026-000007/ }).props.style,
    );
    expect(estilo.minHeight).toBeGreaterThanOrEqual(ALVO_MINIMO);
  });
});
