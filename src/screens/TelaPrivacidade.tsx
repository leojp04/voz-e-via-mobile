// Politica de Privacidade em portugues claro. O texto fica em texto-privacidade.ts; aqui so
// renderizamos. Cada secao tem um titulo marcado como cabecalho (o leitor de tela pula entre eles).
// Como as telas nao tem cabecalho proprio, o botao Voltar e a unica saida.

import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Botao } from '../components/Botao';
import { Tela } from '../components/Tela';
import { cores, espacos, fontes } from '../theme';
import { SECOES_DE_PRIVACIDADE } from './texto-privacidade';

export function TelaPrivacidade() {
  const router = useRouter();

  return (
    <Tela>
      <Text style={styles.titulo} accessibilityRole="header">
        Política de Privacidade
      </Text>

      {SECOES_DE_PRIVACIDADE.map((secao) => (
        <View key={secao.titulo} style={styles.secao}>
          <Text style={styles.subtitulo} accessibilityRole="header">
            {secao.titulo}
          </Text>
          {secao.paragrafos.map((paragrafo) => (
            <Text key={paragrafo} style={styles.texto}>
              {paragrafo}
            </Text>
          ))}
        </View>
      ))}

      <Botao titulo="Voltar" variante="secundario" onPress={() => router.back()} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: fontes.titulo, fontWeight: '700', color: cores.texto },
  secao: { gap: espacos.pequeno },
  subtitulo: { fontSize: fontes.subtitulo, fontWeight: '700', color: cores.texto },
  texto: { fontSize: fontes.corpo, color: cores.texto },
});
