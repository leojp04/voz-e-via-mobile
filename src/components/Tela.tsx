// Moldura padrao das telas: respeita as areas seguras (notch e barra inferior), sobe o conteudo
// quando o teclado abre e rola quando a fonte do sistema esta grande.

import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cores, espacos } from '../theme';

export function Tela({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.area}>
      <KeyboardAvoidingView
        style={styles.area}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { flexGrow: 1, padding: espacos.grande, gap: espacos.medio },
});
