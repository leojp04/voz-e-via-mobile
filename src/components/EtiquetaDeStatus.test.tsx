import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { estiloDoStatus } from '../utils/status-do-reporte';
import { EtiquetaDeStatus } from './EtiquetaDeStatus';

describe('EtiquetaDeStatus', () => {
  it('mostra o rotulo do status em texto (nao so cor)', async () => {
    await render(<EtiquetaDeStatus status="EM_ANALISE" />);
    expect(screen.getByText('Em análise')).toBeOnTheScreen();
  });

  it('o leitor de tela anuncia "Status: ..." como uma frase so', async () => {
    await render(<EtiquetaDeStatus status="RESOLVIDO" />);
    expect(screen.getByLabelText('Status: Resolvido')).toBeOnTheScreen();
  });

  it('usa as cores do status (texto e fundo)', async () => {
    await render(<EtiquetaDeStatus status="CANCELADO" />);
    const { fundo, texto } = estiloDoStatus('CANCELADO');
    const caixa = screen.getByLabelText('Status: Cancelado');
    expect(StyleSheet.flatten(caixa.props.style).backgroundColor).toBe(fundo);
    expect(StyleSheet.flatten(screen.getByText('Cancelado').props.style).color).toBe(texto);
  });

  it('status desconhecido ainda aparece, com o proprio texto', async () => {
    await render(<EtiquetaDeStatus status="EM_VISTORIA" />);
    expect(screen.getByText('EM_VISTORIA')).toBeOnTheScreen();
  });
});
