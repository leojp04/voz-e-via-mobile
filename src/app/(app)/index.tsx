import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../contexts/AuthContext';

// Provisorio: o Inicio de verdade (botoes grandes de microfone, reportar etc.) vem no proximo
// commit. O botao "Sair" so existe para a protecao de rotas poder ser exercitada no app.
export default function HomeScreen() {
  const { sessao, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Voz & Via
      </Text>
      <Text style={styles.subtitle}>Olá, {sessao?.usuario.nome}</Text>
      <Pressable
        style={styles.botao}
        accessibilityRole="button"
        accessibilityLabel="Sair da conta"
        onPress={() => void logout()}
      >
        <Text style={styles.textoBotao}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { fontSize: 32, fontWeight: '700' },
  subtitle: { fontSize: 20 },
  botao: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 24,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 2,
  },
  textoBotao: { fontSize: 18, fontWeight: '600' },
});
