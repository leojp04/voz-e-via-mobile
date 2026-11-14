// Etiqueta do status de um reporte ("Aberto", "Em análise"...): fundo colorido E texto escrito,
// para quem nao distingue cores. O leitor de tela le "Status: Aberto" como uma frase so.

import { StyleSheet, View } from 'react-native';

import { fontes } from '../theme';
import { estiloDoStatus } from '../utils/status-do-reporte';
import { Texto } from './Texto';

export function EtiquetaDeStatus({ status }: { status: string }) {
  const { rotulo, fundo, texto } = estiloDoStatus(status);
  return (
    <View
      accessible
      accessibilityLabel={`Status: ${rotulo}`}
      style={[styles.etiqueta, { backgroundColor: fundo }]}
    >
      <Texto style={[styles.texto, { color: texto }]}>{rotulo}</Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  etiqueta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  texto: { fontSize: fontes.rotulo, fontFamily: fontes.familia.negrito },
});
