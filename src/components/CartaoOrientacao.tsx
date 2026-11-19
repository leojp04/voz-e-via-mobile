// Cartao da orientacao sobre um servico publico (TIRAR_DUVIDA): o que fazer em passos curtos, o site
// oficial e a central gratuita. O conteudo vem da base curada do Java, nunca do texto da IA, entao o
// link e o telefone sao sempre os oficiais. Os botoes so abrem o navegador ou o discador: a pessoa
// continua no controle (nada e enviado nem ligado sozinho).

import { Alert, Linking, StyleSheet, View } from 'react-native';

import type { OrientacaoServico } from '../services/api/types';
import { cores, espacos, fontes } from '../theme';
import { ligarPara } from '../utils/ligar-para';
import { Botao } from './Botao';
import { Texto } from './Texto';

/** Abre o site oficial no navegador; sem navegador, avisa em vez de falhar calado. */
export function abrirSiteOficial(link: string): void {
  Linking.openURL(link).catch(() => {
    Alert.alert('Não foi possível abrir o site', `Abra no navegador: ${link}`);
  });
}

// "https://www.gov.br/pt-br/servicos/..." vira "gov.br": a pessoa ve de onde e o site, sem o endereco inteiro.
function dominio(link: string): string {
  return link.replace(/^https:\/\/(www\.)?/, '').split('/')[0];
}

interface PropsCartaoOrientacao {
  orientacao: OrientacaoServico;
}

export function CartaoOrientacao({ orientacao }: PropsCartaoOrientacao) {
  const site = dominio(orientacao.link);
  return (
    <View style={styles.cartao} accessibilityLiveRegion="polite">
      <Texto style={styles.titulo} accessibilityRole="header">
        {orientacao.titulo}
      </Texto>
      {orientacao.passos.length > 0 ? (
        <View style={styles.bloco}>
          <Texto style={styles.destaque}>Como fazer:</Texto>
          {orientacao.passos.map((passo, indice) => (
            <Texto key={passo} style={styles.texto}>
              {`${indice + 1}. ${passo}`}
            </Texto>
          ))}
        </View>
      ) : null}
      <Botao
        titulo="Abrir o site oficial"
        rotulo={`Abrir o site oficial, ${site}`}
        icone="open-outline"
        onPress={() => abrirSiteOficial(orientacao.link)}
      />
      {orientacao.telefone ? (
        <Botao
          titulo={`Ligar ${orientacao.telefone}`}
          rotulo={`Ligar para a central gratuita, ${orientacao.telefone}`}
          variante="secundario"
          icone="call-outline"
          onPress={() => ligarPara(orientacao.telefone as string)}
        />
      ) : null}
      <Texto style={styles.fonte}>{`Fonte: ${orientacao.orgao} (${site})`}</Texto>
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
  titulo: {
    fontSize: fontes.subtitulo,
    fontFamily: fontes.familia.negrito,
    color: cores.texto,
  },
  destaque: { fontSize: fontes.corpo, fontFamily: fontes.familia.negrito, color: cores.texto },
  texto: { fontSize: fontes.corpo, color: cores.texto },
  fonte: { fontSize: fontes.rotulo, color: cores.textoSecundario },
});
