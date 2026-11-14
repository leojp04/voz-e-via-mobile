# ADR 0009: câmera e localização com expo-image-picker e expo-location

- **Status:** aceita
- **Data:** 13/11/2026

## Contexto

O reporte de zeladoria leva foto e o ponto do GPS (plano único, tela 5 da seção 8.3). A rubrica
desconta biblioteca desnecessária, então cada pacote novo precisa de justificativa. O app roda no
Expo Go durante o desenvolvimento, e o público inclui pessoas idosas e com deficiência.

## Decisão

1. **`expo-image-picker`** (MIT) para tirar a foto e para escolher da galeria. Ele abre a câmera e o
   seletor **nativos do sistema**, que já são acessíveis (VoiceOver e TalkBack funcionam) e não
   exigem tela própria.
2. **`expo-location`** (MIT) para o GPS e para converter o ponto em endereço legível (rua, número,
   bairro e cidade), sem biblioteca extra de geocodificação.
3. **Camada fina em `src/services/aparelho/`** (`camera.ts`, `localizacao.ts`): as telas não falam
   com as bibliotecas; recebem `ArquivoFoto` e `LocalizacaoAtual` ou um `ErroAparelho` com mensagem
   em português. Isso deixa as telas testáveis com `jest.mock`.
4. **Permissão só quando a pessoa toca no botão** ("Tirar foto", "Usar minha localização"), nunca ao
   abrir o app. A localização é pedida **só com o app em uso**, jamais em segundo plano, como a tela
   de Privacidade promete. O microfone não é pedido.
5. **"Escolher da galeria" como alternativa à câmera.** Ajuda quem não consegue fotografar na hora
   e é o único caminho no simulador do iOS (que não tem câmera).
6. **Foto comprimida (`quality: 0.6`) e em JPEG.** O iPhone guarda fotos em HEIC; o modo
   "compatível" entrega JPEG, formato que o servidor aceita. Qualquer outro formato vira erro antes
   do envio.
7. **Textos de permissão em português no `app.json`**, protegidos por teste: sem eles o iOS fecha o
   app ao tentar usar a câmera ou o GPS.

## Alternativas

- **`expo-camera` ou `react-native-vision-camera`:** dão controle total da câmera, mas exigem uma
  tela de câmera própria (mais código e mais acessibilidade para cuidar). O `vision-camera` ainda
  exige development build, o que impede testar no Expo Go.
- **`react-native-maps` (mapa embutido):** decidido não usar nesta etapa. O reporte mostra endereço
  e coordenadas, com um botão "Ver no mapa" que abre o app de mapas do aparelho.
- **`expo-image-manipulator` (redimensionar e converter):** uma biblioteca a mais; a compressão do
  próprio seletor e o modo "compatível" resolvem o necessário.

## Consequências

- A câmera nativa não permite controlar o enquadramento. Para este app, isso é aceitável.
- Converter o ponto em endereço usa o serviço do próprio sistema (Apple ou Google): as coordenadas
  são enviadas a ele. Se falhar, o reporte segue só com latitude e longitude.
- A foto de 0,6 de qualidade ainda pode pesar mais de 1 MB; o servidor precisa limitar o tamanho.
- Crédito e licença das duas bibliotecas (MIT) entram no README.
- Câmera real, GPS real e VoiceOver só podem ser conferidos em celular de verdade, não no simulador.
