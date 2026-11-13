# ADR 0007: Identidade visual (marinho e sálvia, Atkinson Hyperlegible, Ionicons)

- **Status:** aceita
- **Data:** 12/11/2026

## Contexto

O PDF de Mobile avalia "estilização com cores, fontes e imagens personalizadas" e "identidade visual
clara e funcional". Até aqui o app usava o azul padrão e a fonte do sistema. O público (pessoas idosas e
pessoas com deficiência) pede uma sensação de **confiança e calma**, sem abrir mão do piso de
acessibilidade: contraste de pelo menos 4,5:1, alvo de toque de 48 dp, fonte do sistema respeitada e
rótulos para o leitor de tela.

## Decisão

- **Direção "marinho e sálvia"**, escolhida entre três mockups: microfone grande no centro da tela
  inicial (a voz é o produto) e uma grade de atalhos.
- **Paleta** (em `src/theme/index.ts`, com cada par de texto conferido em `theme.test.ts`):
  marinho `#1F3A5F` para a marca e a ação principal, sálvia `#E4EEE8` para a superfície dos atalhos,
  terracota `#A8431F` para "Pedir ajuda" (chama atenção sem o alarme do vermelho puro; 6:1 com branco),
  fundo branco e texto `#1A1A1A`.
- **Fonte Atkinson Hyperlegible**, criada pelo Braille Institute para quem enxerga pouco: letras bem
  distintas entre si. Licença livre (OFL 1.1). Vem pelo pacote `@expo-google-fonts/atkinson-hyperlegible`
  e é carregada com o `expo-font`, que já estava instalado.
- **Ícones com `@expo/vector-icons`** (Ionicons, MIT), pacote oficial do ecossistema Expo. Entram no
  commit seguinte; ficam escondidos do leitor de tela, porque o botão já tem rótulo falado.
- **Componente `Texto`** (`src/components/Texto.tsx`): o `Text` do React Native já com a fonte aplicada.

## Por que um componente `Texto`

No React Native fonte personalizada não usa `fontWeight`: cada peso é uma família
(`AtkinsonHyperlegible_400Regular`, `AtkinsonHyperlegible_700Bold`). O plano inicial era só trocar
`fontWeight` por `fontFamily`, mas isso deixava todo texto **sem** negrito na fonte do sistema. Não dá
para definir a fonte do app inteiro de uma vez (`Text.defaultProps` não existe mais no React 19), então
todo texto passa por `Texto`, que aplica a família normal e deixa a tela sobrescrever para o negrito.

## Alternativas

- **Fonte do sistema:** zero custo, mas some o "fontes personalizadas" do PDF e a identidade.
- **Verdana ou outra fonte "legível" genérica:** sem licença aberta clara para empacotar no app.
- **Ícones desenhados à mão com `react-native-svg`:** controle total, mas é outra biblioteca e muito
  mais trabalho para meia dúzia de ícones.
- **Emoji como ícone:** nenhuma biblioteca, mas cada sistema desenha de um jeito e fica infantil.
- **`Text.defaultProps` para a fonte global:** não funciona no React 19.

## Consequências

- Dois pacotes novos, ambos justificados aqui: `@expo-google-fonts/atkinson-hyperlegible` e
  `@expo/vector-icons`.
- O app só desenha a primeira tela depois que as fontes carregam; o splash fica aberto até lá. Se o
  carregamento falhar, o app segue com a fonte do sistema.
- Texto novo deve usar `Texto` (e não `Text`) e `fontFamily` (e não `fontWeight`).
- Créditos e licenças vão para o README no commit da logo.
