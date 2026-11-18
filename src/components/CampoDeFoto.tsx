// Campo da foto do reporte (opcional): mostra a foto escolhida e oferece camera, galeria e
// remover. O componente so desenha e avisa os toques; quem fala com o aparelho e a tela
// (services/aparelho/camera.ts), o que deixa este componente simples de testar.

import { Image, StyleSheet, View } from 'react-native';

import type { ArquivoFoto } from '../services/api/types';
import { cores, espacos, fontes, IDIOMA_DO_APP } from '../theme';
import { Botao } from './Botao';
import { Texto } from './Texto';

interface PropsCampoDeFoto {
  /** Foto escolhida; null = ainda sem foto. */
  foto: ArquivoFoto | null;
  aoTirarFoto: () => void;
  aoEscolherDaGaleria: () => void;
  aoRemover: () => void;
  /** true (ex.: enviando) desabilita os botoes. */
  ocupado?: boolean;
  /** Mensagem a mostrar abaixo; null/ausente = sem erro. */
  erro?: string | null;
}

export function CampoDeFoto({
  foto,
  aoTirarFoto,
  aoEscolherDaGaleria,
  aoRemover,
  ocupado = false,
  erro,
}: PropsCampoDeFoto) {
  return (
    <View style={styles.grupo}>
      <Texto style={styles.rotulo}>Foto (opcional)</Texto>
      {foto ? (
        <Image
          source={{ uri: foto.uri }}
          accessibilityRole="image"
          accessibilityLabel="Foto do problema"
          accessibilityLanguage={IDIOMA_DO_APP}
          style={styles.imagem}
          resizeMode="cover"
        />
      ) : null}
      <Botao
        titulo="Tirar foto"
        variante="secundario"
        icone="camera-outline"
        onPress={aoTirarFoto}
        desabilitado={ocupado}
      />
      <Botao
        titulo="Escolher da galeria"
        variante="secundario"
        icone="images-outline"
        onPress={aoEscolherDaGaleria}
        desabilitado={ocupado}
      />
      {foto ? (
        <Botao
          titulo="Remover foto"
          variante="secundario"
          icone="trash-outline"
          onPress={aoRemover}
          desabilitado={ocupado}
        />
      ) : null}
      {erro ? (
        <Texto style={styles.erro} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {erro}
        </Texto>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: espacos.pequeno },
  rotulo: { fontSize: fontes.rotulo, fontFamily: fontes.familia.negrito, color: cores.texto },
  imagem: { width: '100%', height: 200, borderRadius: 8, backgroundColor: cores.superficie },
  erro: { fontSize: fontes.rotulo, color: cores.erro },
});
