// Politica de Privacidade em portugues claro. O texto fica em texto-privacidade.ts; aqui so
// renderizamos. Cada secao tem um titulo marcado como cabecalho (o leitor de tela pula entre eles).
// Como as telas nao tem cabecalho proprio, o botao Voltar e a unica saida.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Botao } from '../components/Botao';
import { Tela } from '../components/Tela';
import { Texto } from '../components/Texto';
import { useAuth } from '../contexts/AuthContext';
import { cores, espacos, fontes } from '../theme';
import { mensagemDeErroAoExcluir } from '../utils/mensagem-de-erro';
import { SECOES_DE_PRIVACIDADE } from './texto-privacidade';

export function TelaPrivacidade() {
  const router = useRouter();
  const { status, excluirConta } = useAuth();
  const [excluindo, setExcluindo] = useState(false);

  async function excluir() {
    setExcluindo(true);
    try {
      await excluirConta();
      // Esta tela fica fora dos grupos protegidos, entao nao sai sozinha quando a sessao acaba.
      router.replace('/login');
    } catch (erro) {
      setExcluindo(false);
      Alert.alert('Não foi possível excluir', mensagemDeErroAoExcluir(erro));
    }
  }

  // Dois passos de proposito: apagar a conta nao tem volta, entao o primeiro toque so pergunta.
  function pedirConfirmacao() {
    Alert.alert(
      'Excluir a conta?',
      'Isso apaga a sua conta e os seus dados. Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir minha conta', style: 'destructive', onPress: () => void excluir() },
      ],
    );
  }

  return (
    <Tela>
      <Texto style={styles.titulo} accessibilityRole="header">
        Política de Privacidade
      </Texto>

      {SECOES_DE_PRIVACIDADE.map((secao) => (
        <View key={secao.titulo} style={styles.secao}>
          <Texto style={styles.subtitulo} accessibilityRole="header">
            {secao.titulo}
          </Texto>
          {secao.paragrafos.map((paragrafo) => (
            <Texto key={paragrafo} style={styles.texto}>
              {paragrafo}
            </Texto>
          ))}
        </View>
      ))}

      {status === 'autenticado' ? (
        <Botao
          titulo="Excluir minha conta"
          variante="perigo"
          carregando={excluindo}
          onPress={pedirConfirmacao}
        />
      ) : null}

      <Botao titulo="Voltar" variante="secundario" onPress={() => router.back()} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: fontes.titulo, fontFamily: fontes.familia.negrito, color: cores.texto },
  secao: { gap: espacos.pequeno },
  subtitulo: { fontSize: fontes.subtitulo, fontFamily: fontes.familia.negrito, color: cores.texto },
  texto: { fontSize: fontes.corpo, color: cores.texto },
});
