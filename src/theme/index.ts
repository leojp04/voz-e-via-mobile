// Tema do app: cores, espacos e tamanhos num lugar so, para toda tela ficar consistente e
// acessivel. Os pares de cor sao conferidos por teste (theme.test.ts): texto precisa de pelo
// menos 4,5:1 de contraste (WCAG 2.2 AA) e bordas de campos, 3:1.

export const cores = {
  fundo: '#FFFFFF',
  texto: '#1A1A1A',
  textoSecundario: '#4A4A4A',
  // Marinho: cor da marca e da acao principal (botoes, links). Passa confianca e calma.
  acao: '#1F3A5F',
  textoSobreAcao: '#FFFFFF',
  // Salvia: fundo suave dos atalhos da tela de Inicio.
  superficie: '#E4EEE8',
  // Terracota: "Pedir ajuda". Chama a atencao sem o alarme do vermelho puro.
  ajuda: '#A8431F',
  perigo: '#B3261E',
  erro: '#B3261E',
  fundoErro: '#FDECEA',
  borda: '#6B6B6B',
} as const;

/** Tamanho minimo de area tocavel, em dp (recomendacao de acessibilidade do Android e do iOS). */
export const ALVO_MINIMO = 48;

export const espacos = {
  pequeno: 8,
  medio: 16,
  grande: 24,
} as const;

export const fontes = {
  // Atkinson Hyperlegible (Braille Institute), feita para quem enxerga pouco. No React Native cada
  // peso e uma familia: use "regular" ou "negrito" em fontFamily e nao fontWeight.
  familia: {
    regular: 'AtkinsonHyperlegible_400Regular',
    negrito: 'AtkinsonHyperlegible_700Bold',
  },
  corpo: 18,
  rotulo: 16,
  botao: 18,
  titulo: 32,
  subtitulo: 20,
} as const;

// Luminancia relativa de uma cor "#RRGGBB" (formula do WCAG): quanto ela "brilha" para o olho,
// de 0 (preto) a 1 (branco). Os canais sao corrigidos porque a tela nao e linear.
function luminancia(hex: string): number {
  const canais = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canais.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razao de contraste entre duas cores "#RRGGBB", de 1 (igual) a 21 (preto no branco). */
export function razaoDeContraste(a: string, b: string): number {
  const [mais, menos] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (mais + 0.05) / (menos + 0.05);
}
