// Bloco "Localizacao" do reporte: sem ponto ainda, oferece "Usar minha localizacao"; com ponto,
// mostra o endereco e as coordenadas, e deixa atualizar ou abrir no app de mapas ("Ver no
// mapa", sem biblioteca de mapa: docs/adr/0009). Como no CampoDeFoto, so desenha e avisa os
// toques; quem le o GPS e a tela (services/aparelho/localizacao.ts).

import { StyleSheet, View } from 'react-native';

import type { LocalizacaoAtual } from '../services/aparelho/localizacao';
import { cores, espacos, fontes } from '../theme';
import { abrirNoMapa } from '../utils/url-do-mapa';
import { Botao } from './Botao';
import { Texto } from './Texto';

interface PropsBlocoLocalizacao {
  /** Ponto ja registrado; null = ainda nao informado. */
  localizacao: LocalizacaoAtual | null;
  /** true enquanto o GPS esta sendo lido. */
  obtendo: boolean;
  aoUsar: () => void;
  /** Mensagem a mostrar abaixo; null/ausente = sem erro. */
  erro?: string | null;
}

export function BlocoLocalizacao({ localizacao, obtendo, aoUsar, erro }: PropsBlocoLocalizacao) {
  return (
    <View style={styles.grupo}>
      <Texto style={styles.rotulo}>Localização</Texto>
      {localizacao ? (
        <>
          <View style={styles.caixa}>
            <Texto style={styles.endereco}>
              {localizacao.endereco ??
                'Endereço não encontrado, mas o ponto no mapa foi registrado.'}
            </Texto>
            <Texto style={styles.coordenadas}>
              {`${localizacao.latitude.toFixed(5)}, ${localizacao.longitude.toFixed(5)}`}
            </Texto>
          </View>
          <Botao
            titulo="Atualizar localização"
            variante="secundario"
            icone="locate-outline"
            onPress={aoUsar}
            carregando={obtendo}
          />
          <Botao
            titulo="Ver no mapa"
            variante="secundario"
            icone="map-outline"
            onPress={() => abrirNoMapa(localizacao.latitude, localizacao.longitude)}
          />
        </>
      ) : (
        <Botao
          titulo="Usar minha localização"
          variante="secundario"
          icone="location-outline"
          onPress={aoUsar}
          carregando={obtendo}
        />
      )}
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
  caixa: {
    padding: espacos.medio,
    gap: 4,
    borderRadius: 8,
    backgroundColor: cores.superficie,
  },
  endereco: { fontSize: fontes.corpo, color: cores.texto },
  coordenadas: { fontSize: fontes.rotulo, color: cores.textoSecundario },
  erro: { fontSize: fontes.rotulo, color: cores.erro },
});
