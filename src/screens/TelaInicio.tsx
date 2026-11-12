// Tela de Inicio: botoes grandes para as acoes principais do app. Por enquanto nenhuma delas
// tem funcao (cada etapa seguinte liga uma): tocar mostra "Em breve" para o botao nao parecer
// quebrado. O botao Sair e o unico que ja funciona e limpa a sessao do cofre.

import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text } from 'react-native';

import { Botao } from '../components/Botao';
import { Tela } from '../components/Tela';
import { useAuth } from '../contexts/AuthContext';
import { cores, fontes } from '../theme';

interface AcaoDoInicio {
  titulo: string;
  /** Frase completa lida pelo leitor de tela. */
  rotulo: string;
}

const ACOES: AcaoDoInicio[] = [
  { titulo: 'Falar com o assistente', rotulo: 'Falar com o assistente por voz' },
  { titulo: 'Reportar problema', rotulo: 'Reportar um problema na rua' },
  { titulo: 'Meus reportes', rotulo: 'Meus reportes' },
  { titulo: 'Contatos', rotulo: 'Contatos de emergência' },
  { titulo: 'Pedir ajuda', rotulo: 'Pedir ajuda' },
];

export function TelaInicio() {
  const { sessao, logout } = useAuth();
  const router = useRouter();

  return (
    <Tela>
      <Text style={styles.titulo} accessibilityRole="header">
        Voz & Via
      </Text>
      <Text style={styles.saudacao}>Olá, {sessao?.usuario.nome}</Text>

      {ACOES.map((acao) => (
        <Botao
          key={acao.rotulo}
          titulo={acao.titulo}
          rotulo={acao.rotulo}
          grande
          // "A funcao X" concorda com qualquer nome (singular ou plural).
          onPress={() =>
            Alert.alert('Em breve', `A função "${acao.titulo}" ainda não está disponível.`)
          }
        />
      ))}

      <Botao
        titulo="Privacidade"
        rotulo="Política de privacidade"
        variante="secundario"
        onPress={() => router.push('/privacidade')}
      />
      <Botao titulo="Sobre o app" variante="secundario" onPress={() => router.push('/sobre')} />

      <Botao
        titulo="Sair"
        rotulo="Sair da conta"
        variante="secundario"
        onPress={() => void logout()}
      />
    </Tela>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: fontes.titulo, fontWeight: '700', color: cores.texto },
  saudacao: { fontSize: fontes.subtitulo, color: cores.textoSecundario },
});
