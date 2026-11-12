import { StyleSheet, Text, View } from 'react-native';

// Provisorio: a tela de login de verdade (formulario, validacao e erros) vem no proximo commit.
export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Entrar
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '700' },
});
