// Tela "Sobre o App": versao e hash do commit do codigo que gerou este app (exigencia do PDF de
// Mobile: a versao publicada tem de corresponder ao codigo-fonte enviado).

import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Botao } from '../components/Botao';
import { Tela } from '../components/Tela';
import { cores, espacos, fontes } from '../theme';
import { lerInfoDoApp } from '../utils/info-do-app';

function Dado({ nome, valor, rotulo }: { nome: string; valor: string; rotulo: string }) {
  // O leitor de tela le o dado inteiro de uma vez ("Versao do app: 1.0.0").
  return (
    <View style={styles.dado} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <Text style={styles.nome}>{nome}</Text>
      <Text style={styles.valor} selectable>
        {valor}
      </Text>
    </View>
  );
}

export function TelaSobre() {
  const router = useRouter();
  const { versao, commitHash } = lerInfoDoApp(Constants.expoConfig);

  return (
    <Tela>
      <Text style={styles.titulo} accessibilityRole="header">
        Sobre o app
      </Text>
      <Text style={styles.texto}>
        Voz & Via ajuda pessoas idosas e pessoas com deficiência a pedir ajuda por voz e a reportar
        barreiras na rua. Projeto da Global Solution 2026/2 (FIAP).
      </Text>

      <Dado nome="Versão" valor={versao} rotulo="Versão do app" />
      <Dado nome="Commit do código" valor={commitHash} rotulo="Commit do código" />

      <Botao titulo="Voltar" variante="secundario" onPress={() => router.back()} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: fontes.titulo, fontWeight: '700', color: cores.texto },
  texto: { fontSize: fontes.corpo, color: cores.texto },
  dado: { gap: espacos.pequeno },
  nome: { fontSize: fontes.rotulo, color: cores.textoSecundario },
  valor: { fontSize: fontes.subtitulo, fontWeight: '700', color: cores.texto },
});
