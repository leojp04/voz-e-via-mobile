// Selo no topo dos cartoes do assistente: diz, com icone E texto (nunca so pela cor), que tipo de
// ajuda a pessoa esta vendo. Golpe tem tratamento proprio porque a pressa e outra:
//  - "Verificação de golpe": o parecer sobre uma mensagem, ligacao ou link recebido.
//  - "Ajuda contra golpe": quem ja caiu num golpe (o que fazer agora) ou quer aprender a reconhecer.
//  - "Orientação": duvida comum sobre um servico ou direito.

import { StyleSheet, View } from 'react-native';

import { cores, espacos, fontes } from '../theme';
import { Icone, type NomeDeIcone } from './Icone';
import { Texto } from './Texto';

export type TipoDeAjuda = 'verificacao-golpe' | 'ajuda-golpe' | 'orientacao';

const SELOS: Record<TipoDeAjuda, { texto: string; icone: NomeDeIcone; cor: string }> = {
  'verificacao-golpe': {
    texto: 'Verificação de golpe',
    icone: 'shield-checkmark-outline',
    cor: cores.perigo,
  },
  'ajuda-golpe': { texto: 'Ajuda contra golpe', icone: 'warning-outline', cor: cores.perigo },
  orientacao: { texto: 'Orientação', icone: 'information-circle-outline', cor: cores.acao },
};

/** Cor da borda do cartao de cada tipo de ajuda (o selo repete a informacao em texto). */
export function corDaAjuda(tipo: TipoDeAjuda): string {
  return SELOS[tipo].cor;
}

export function SeloDeAjuda({ tipo }: { tipo: TipoDeAjuda }) {
  const selo = SELOS[tipo];
  return (
    <View style={styles.selo}>
      <Icone nome={selo.icone} tamanho={22} cor={selo.cor} />
      <Texto style={[styles.texto, { color: selo.cor }]}>{selo.texto}</Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  selo: { flexDirection: 'row', alignItems: 'center', gap: espacos.pequeno },
  texto: { fontSize: fontes.rotulo, fontFamily: fontes.familia.negrito, flexShrink: 1 },
});
