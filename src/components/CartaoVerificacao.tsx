// Cartao do parecer sobre uma mensagem suspeita ("isso e golpe?"): classificacao em TEXTO (nunca so
// por cor), tipo de golpe, sinais, orientacao do que fazer, canal oficial e fontes. O app nao
// decide nada: mostra o parecer do Java. "Sem sinais de risco" NAO e garantia de seguranca, e o
// cartao diz isso, para ninguem baixar a guarda por causa de um resultado verde.

import { StyleSheet, View } from 'react-native';

import type { ClassificacaoGolpe, ResultadoVerificacao } from '../services/api/types';
import { cores, espacos, fontes } from '../theme';
import { Texto } from './Texto';

const TEXTO_DA_CLASSIFICACAO: Record<ClassificacaoGolpe, string> = {
  PROVAVEL_GOLPE: 'Provável golpe',
  SUSPEITA: 'Mensagem suspeita',
  NAO_E_POSSIVEL_AVALIAR: 'Não foi possível avaliar',
  SEM_SINAIS_DE_RISCO: 'Sem sinais de risco',
};

const AVISO_SEM_SINAIS =
  'Isso não garante que a mensagem seja segura. Na dúvida, não clique em links nem passe dados.';

interface PropsCartaoVerificacao {
  resultado: ResultadoVerificacao;
}

export function CartaoVerificacao({ resultado }: PropsCartaoVerificacao) {
  return (
    <View style={styles.cartao} accessibilityLiveRegion="polite">
      <Texto style={styles.classificacao}>{TEXTO_DA_CLASSIFICACAO[resultado.classificacao]}</Texto>
      {resultado.tipoGolpe ? <Texto style={styles.destaque}>{resultado.tipoGolpe}</Texto> : null}
      {resultado.classificacao === 'SEM_SINAIS_DE_RISCO' ? (
        <Texto style={styles.texto}>{AVISO_SEM_SINAIS}</Texto>
      ) : null}
      {resultado.sinais.length > 0 ? (
        <View style={styles.bloco}>
          <Texto style={styles.destaque}>Sinais encontrados:</Texto>
          {resultado.sinais.map((sinal) => (
            <Texto key={sinal} style={styles.texto}>
              {sinal}
            </Texto>
          ))}
        </View>
      ) : null}
      <Texto style={styles.texto}>{resultado.orientacao}</Texto>
      {resultado.canalOficial ? (
        <Texto style={styles.destaque}>{`Canal oficial: ${resultado.canalOficial}`}</Texto>
      ) : null}
      {resultado.fontes.map((fonte) => (
        <Texto key={fonte.url} style={styles.fonte}>
          {`Fonte: ${fonte.titulo} (${fonte.orgao})`}
        </Texto>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    padding: espacos.medio,
    gap: espacos.pequeno,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: cores.acao,
    backgroundColor: cores.fundo,
  },
  bloco: { gap: 4 },
  classificacao: {
    fontSize: fontes.subtitulo,
    fontFamily: fontes.familia.negrito,
    color: cores.texto,
  },
  destaque: { fontSize: fontes.corpo, fontFamily: fontes.familia.negrito, color: cores.texto },
  texto: { fontSize: fontes.corpo, color: cores.texto },
  fonte: { fontSize: fontes.rotulo, color: cores.textoSecundario },
});
