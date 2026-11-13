import { ALVO_MINIMO, cores, fontes, razaoDeContraste } from './index';

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
    ['texto do botão de ajuda', cores.textoSobreAcao, cores.ajuda],
    ['texto sobre a superfície dos atalhos', cores.texto, cores.superficie],
    ['ação sobre a superfície dos atalhos', cores.acao, cores.superficie],
    ['texto secundário sobre a superfície dos atalhos', cores.textoSecundario, cores.superficie],
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

describe('fonte Atkinson Hyperlegible', () => {
  // No React Native, fonte personalizada não usa fontWeight: cada peso é uma família, e o nome
  // precisa ser idêntico ao que o pacote @expo-google-fonts registra.
  it('tem uma família para o texto normal e outra para o negrito', () => {
    expect(fontes.familia.regular).toBe('AtkinsonHyperlegible_400Regular');
    expect(fontes.familia.negrito).toBe('AtkinsonHyperlegible_700Bold');
  });
});
