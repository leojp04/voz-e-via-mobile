import { ALVO_MINIMO, cores, razaoDeContraste } from './index';

describe('razaoDeContraste', () => {
  it('preto sobre branco dá 21:1 (o máximo possível)', () => {
    expect(razaoDeContraste('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });

  it('cores iguais dão 1:1', () => {
    expect(razaoDeContraste('#336699', '#336699')).toBeCloseTo(1, 5);
  });

  it('não depende da ordem das cores', () => {
    expect(razaoDeContraste('#0B57D0', '#FFFFFF')).toBeCloseTo(
      razaoDeContraste('#FFFFFF', '#0B57D0'),
      10,
    );
  });
});

describe('tema acessível (WCAG AA: texto precisa de pelo menos 4,5:1)', () => {
  const paresDeTexto: [string, string, string][] = [
    ['texto sobre fundo', cores.texto, cores.fundo],
    ['texto secundário sobre fundo', cores.textoSecundario, cores.fundo],
    ['texto do botão primário', cores.textoSobreAcao, cores.acao],
    ['texto do botão de perigo', cores.textoSobreAcao, cores.perigo],
    ['erro sobre fundo', cores.erro, cores.fundo],
    ['erro sobre faixa de erro', cores.erro, cores.fundoErro],
    ['ação (link) sobre fundo', cores.acao, cores.fundo],
  ];

  it.each(paresDeTexto)('%s tem contraste de pelo menos 4,5:1', (_nome, frente, fundo) => {
    expect(razaoDeContraste(frente, fundo)).toBeGreaterThanOrEqual(4.5);
  });

  it('a borda dos campos tem pelo menos 3:1 contra o fundo (componentes de interface)', () => {
    expect(razaoDeContraste(cores.borda, cores.fundo)).toBeGreaterThanOrEqual(3);
  });

  it('o alvo de toque mínimo é 48 dp', () => {
    expect(ALVO_MINIMO).toBe(48);
  });
});
