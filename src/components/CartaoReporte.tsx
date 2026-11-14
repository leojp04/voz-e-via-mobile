// Cartao de um reporte na lista "Meus reportes": categoria, status, descricao (2 linhas),
// protocolo e data. O cartao inteiro e UM botao (area de toque grande), e o leitor de tela le
// protocolo, categoria e status de uma vez, sem precisar passar por cada pedaco.

import { Pressable, StyleSheet, View } from 'react-native';

import type { ReporteResumo } from '../services/api/types';
import { ALVO_MINIMO, cores, espacos, fontes } from '../theme';
import { formatarData } from '../utils/formatar-data';
import { estiloDoStatus } from '../utils/status-do-reporte';
import { EtiquetaDeStatus } from './EtiquetaDeStatus';
import { Protocolo } from './Protocolo';
import { Texto } from './Texto';

interface PropsCartaoReporte {
  reporte: ReporteResumo;
  aoAbrir: () => void;
}

export function CartaoReporte({ reporte, aoAbrir }: PropsCartaoReporte) {
  const rotuloDoStatus = estiloDoStatus(reporte.status).rotulo;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Reporte ${reporte.protocolo}, ${reporte.categoria.nome}, status ${rotuloDoStatus}`}
      onPress={aoAbrir}
      style={({ pressed }) => [styles.cartao, pressed && styles.pressionado]}
    >
      <View style={styles.linhaDoTopo}>
        <Texto style={styles.categoria}>{reporte.categoria.nome}</Texto>
        <EtiquetaDeStatus status={reporte.status} />
      </View>
      <Texto style={styles.descricao} numberOfLines={2}>
        {reporte.descricao}
      </Texto>
      <Protocolo valor={reporte.protocolo} style={styles.detalhes} />
      <Texto style={styles.detalhes}>{formatarData(reporte.criadoEm)}</Texto>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartao: {
    minHeight: ALVO_MINIMO,
    padding: espacos.medio,
    gap: espacos.pequeno,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: cores.acao,
    backgroundColor: cores.fundo,
  },
  pressionado: { opacity: 0.85 },
  linhaDoTopo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacos.pequeno,
  },
  categoria: {
    flexShrink: 1,
    fontSize: fontes.botao,
    fontFamily: fontes.familia.negrito,
    color: cores.texto,
  },
  descricao: { fontSize: fontes.corpo, color: cores.texto },
  detalhes: { fontSize: fontes.rotulo, color: cores.textoSecundario },
});
