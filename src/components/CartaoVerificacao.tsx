// Cartao do parecer sobre uma mensagem suspeita ("isso e golpe?"): classificacao em TEXTO (nunca so
// por cor), tipo de golpe, sinais, orientacao do que fazer, canal oficial e fontes. O app nao
// decide nada: mostra o parecer do Java. "Sem sinais de risco" NAO e garantia de seguranca, e o
// cartao diz isso, para ninguem baixar a guarda por causa de um resultado verde.

import { StyleSheet, View } from 'react-native';

import type { ClassificacaoGolpe, ResultadoVerificacao } from '../services/api/types';
import { cores, espacos, fontes } from '../theme';
import { ligarPara } from '../utils/ligar-para';
import { Botao } from './Botao';
import { abrirSiteOficial } from './CartaoOrientacao';
import { corDaAjuda, SeloDeAjuda } from './SeloDeAjuda';
import { Texto } from './Texto';

const TEXTO_DA_CLASSIFICACAO: Record<ClassificacaoGolpe, string> = {
  PROVAVEL_GOLPE: 'Provável golpe',
  SUSPEITA: 'Mensagem suspeita',
  NAO_E_POSSIVEL_AVALIAR: 'Não foi possível avaliar',
  SEM_SINAIS_DE_RISCO: 'Sem sinais de risco',
};

// O Java manda o tipo como codigo (PREMIO_FALSO). A pessoa le texto: cada codigo conhecido vira uma
// frase. NENHUM e codigo que o app nao conhece ficam de fora, para nunca aparecer um codigo cru.
const TEXTO_DO_TIPO_DE_GOLPE: Record<string, string> = {
  FALSO_BENEFICIO: 'Falso benefício',
  FALSA_CENTRAL_BANCO: 'Falsa central do banco',
  FALSO_PARENTE: 'Falso parente',
  FALSA_COBRANCA: 'Falsa cobrança',
  PREMIO_FALSO: 'Falso prêmio',
  FALSA_ENTREGA: 'Falsa entrega',
  FALSO_SERVICO_SAUDE: 'Falso serviço de saúde',
  LINK_MALICIOSO: 'Link malicioso',
  OUTRO: 'Outro tipo de golpe',
};

// Centrais oficiais gratuitas: se o canal oficial citar uma delas ("Central 135"), o cartao oferece ligar.
const CENTRAIS_OFICIAIS = /\b(100|121|135|136|180|188|190|192|193)\b/;

const AVISO_SEM_SINAIS =
  'Isso não garante que a mensagem seja segura. Na dúvida, não clique em links nem passe dados.';

interface PropsCartaoVerificacao {
  resultado: ResultadoVerificacao;
}

export function CartaoVerificacao({ resultado }: PropsCartaoVerificacao) {
  const tipoDeGolpe = resultado.tipoGolpe ? TEXTO_DO_TIPO_DE_GOLPE[resultado.tipoGolpe] : undefined;
  // Golpe provavel ou suspeito: borda de alerta. Sem sinais, a borda comum (e o aviso de que nao e garantia).
  const central = resultado.canalOficial?.match(CENTRAIS_OFICIAIS)?.[1] ?? null;
  const emAlerta =
    resultado.classificacao === 'PROVAVEL_GOLPE' || resultado.classificacao === 'SUSPEITA';
  return (
    <View
      style={[styles.cartao, emAlerta ? { borderColor: corDaAjuda('verificacao-golpe') } : null]}
      accessibilityLiveRegion="polite"
    >
      <SeloDeAjuda tipo="verificacao-golpe" />
      <Texto style={styles.classificacao}>{TEXTO_DA_CLASSIFICACAO[resultado.classificacao]}</Texto>
      {tipoDeGolpe ? <Texto style={styles.destaque}>{tipoDeGolpe}</Texto> : null}
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
      {central ? (
        <Botao
          titulo={`Ligar ${central}`}
          rotulo={`Ligar para o canal oficial, ${central}`}
          icone="call-outline"
          onPress={() => ligarPara(central)}
        />
      ) : null}
      {resultado.fontes
        .filter((fonte) => fonte.url.startsWith('https://'))
        .map((fonte) => (
          <Botao
            key={fonte.url}
            titulo={`Fonte: ${fonte.titulo} (${fonte.orgao})`}
            rotulo={`Abrir a fonte: ${fonte.titulo} (${fonte.orgao})`}
            variante="secundario"
            icone="open-outline"
            onPress={() => abrirSiteOficial(fonte.url)}
          />
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
