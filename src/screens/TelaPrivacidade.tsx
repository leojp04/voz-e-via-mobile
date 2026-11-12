// Politica de Privacidade. Neste commit e so uma tela minima, para o link do Cadastro nao ficar
// quebrado; o texto completo (o que coletamos, para que, quem ve e como excluir) vem no proximo.
// Como as telas nao tem cabecalho, o botao Voltar e a unica saida.

import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Botao } from '../components/Botao';
import { Tela } from '../components/Tela';
import { cores, fontes } from '../theme';

export function TelaPrivacidade() {
  const router = useRouter();

  return (
    <Tela>
      <Text style={styles.titulo} accessibilityRole="header">
        Política de Privacidade
      </Text>
      <Text style={styles.texto}>O texto completo será publicado em breve.</Text>
      <Botao titulo="Voltar" variante="secundario" onPress={() => router.back()} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: fontes.titulo, fontWeight: '700', color: cores.texto },
  texto: { fontSize: fontes.corpo, color: cores.texto },
});
