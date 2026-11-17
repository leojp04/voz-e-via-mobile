import { fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';

import { SeletorDeOpcao } from './SeletorDeOpcao';

const URGENCIAS = [
  { valor: 'BAIXA', titulo: 'Baixa' },
  { valor: 'MEDIA', titulo: 'Média' },
  { valor: 'ALTA', titulo: 'Alta' },
];

describe('SeletorDeOpcao', () => {
  it('e um grupo de opcoes (radio) com o rotulo como nome', async () => {
    await render(
      <SeletorDeOpcao rotulo="Urgência" opcoes={URGENCIAS} valor="MEDIA" aoMudar={jest.fn()} />,
    );
    // O grupo NAO e "accessible" de proposito: se fosse, o VoiceOver trataria o grupo todo como um
    // item so e esconderia as opcoes. Por isso a busca e pelo rotulo, nao por getByRole.
    const grupo = screen.getByLabelText('Urgência');
    expect(grupo.props.accessibilityRole).toBe('radiogroup');
    expect(grupo.props.accessible).not.toBe(true);
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('marca so a opcao escolhida, avisada ao leitor de tela', async () => {
    await render(
      <SeletorDeOpcao rotulo="Urgência" opcoes={URGENCIAS} valor="MEDIA" aoMudar={jest.fn()} />,
    );
    expect(screen.getByRole('radio', { name: 'Média' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Baixa' })).not.toBeSelected();
    expect(screen.getByRole('radio', { name: 'Alta' })).not.toBeSelected();
  });

  it('sem valor escolhido, nenhuma opcao vem marcada', async () => {
    await render(
      <SeletorDeOpcao rotulo="Urgência" opcoes={URGENCIAS} valor={null} aoMudar={jest.fn()} />,
    );
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeSelected();
  });

  it('tocar numa opcao avisa qual foi escolhida', async () => {
    const aoMudar = jest.fn();
    await render(
      <SeletorDeOpcao rotulo="Urgência" opcoes={URGENCIAS} valor="MEDIA" aoMudar={aoMudar} />,
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Alta' }));
    expect(aoMudar).toHaveBeenCalledWith('ALTA');
  });

  it('funciona com valores numericos (ex.: id da categoria)', async () => {
    const aoMudar = jest.fn();
    await render(
      <SeletorDeOpcao
        rotulo="Categoria"
        opcoes={[
          { valor: 1, titulo: 'Calçada quebrada' },
          { valor: 3, titulo: 'Buraco na rua' },
        ]}
        valor={null}
        aoMudar={aoMudar}
      />,
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Buraco na rua' }));
    expect(aoMudar).toHaveBeenCalledWith(3);
  });

  it('mostra o erro como alerta, perto das opcoes', async () => {
    await render(
      <SeletorDeOpcao
        rotulo="Categoria"
        opcoes={URGENCIAS}
        valor={null}
        aoMudar={jest.fn()}
        erro="Escolha uma categoria."
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha uma categoria.');
  });

  it('sem erro, nao mostra alerta', async () => {
    await render(
      <SeletorDeOpcao rotulo="Urgência" opcoes={URGENCIAS} valor="MEDIA" aoMudar={jest.fn()} />,
    );
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  // Na letra máxima (310%) uma palavra como "acessibilidade" não cabe nem na linha inteira e quebra
  // no meio ("acessibilid/ade"). Descoberto no simulador na tela Novo reporte.
  it('limita o texto de cada opção a 200% da letra do sistema', async () => {
    await render(
      <SeletorDeOpcao rotulo="Urgência" opcoes={URGENCIAS} valor="MEDIA" aoMudar={jest.fn()} />,
    );
    for (const opcao of URGENCIAS) {
      expect(screen.getByText(opcao.titulo).props.maxFontSizeMultiplier).toBe(2);
    }
  });

  describe('com a letra do sistema muito grande', () => {
    afterEach(() => jest.restoreAllMocks());

    function usarEscalaDeFonte(fontScale: number) {
      jest
        .spyOn(Dimensions, 'get')
        .mockReturnValue({ width: 402, height: 874, scale: 3, fontScale });
    }

    // Lado a lado, cada opcao ganha so metade da largura e palavras como "Cidadão" quebram no meio
    // ("Cidadã/o"). Descoberto no simulador com "accessibility-extra-large".
    it('cada opcao ocupa a linha inteira, para as palavras nao quebrarem no meio', async () => {
      usarEscalaDeFonte(2);
      await render(
        <SeletorDeOpcao rotulo="Urgência" opcoes={URGENCIAS} valor="MEDIA" aoMudar={jest.fn()} />,
      );
      for (const radio of screen.getAllByRole('radio')) {
        expect(StyleSheet.flatten(radio.props.style).flexBasis).toBe('100%');
      }
    });

    it('com letra normal, as opcoes continuam lado a lado (sem linha inteira)', async () => {
      usarEscalaDeFonte(1);
      await render(
        <SeletorDeOpcao rotulo="Urgência" opcoes={URGENCIAS} valor="MEDIA" aoMudar={jest.fn()} />,
      );
      for (const radio of screen.getAllByRole('radio')) {
        expect(StyleSheet.flatten(radio.props.style).flexBasis).toBeUndefined();
      }
    });
  });
});
