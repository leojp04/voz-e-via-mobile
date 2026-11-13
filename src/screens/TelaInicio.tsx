// Tela de Inicio (direcao visual "marinho e salvia", ADR 0007): o microfone em destaque no
// centro, uma grade de atalhos e o "Pedir ajuda" em terracota. Por enquanto so Sobre o app,
// Privacidade e Sair funcionam; as demais acoes mostram "Em breve" para nao parecerem quebradas
// (cada etapa seguinte liga uma). Os rotulos falados continuam completos ("Reportar um problema
// na rua"), mesmo com o titulo curto na tela.

import { useRouter } from 'expo-router';
import { Alert, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AtalhoQuadrado } from '../components/AtalhoQuadrado';
import { Botao } from '../components/Botao';
import { BotaoMicrofone } from '../components/BotaoMicrofone';
import type { NomeDeIcone } from '../components/Icone';
import { Tela } from '../components/Tela';
import { Texto } from '../components/Texto';
import { useAuth } from '../contexts/AuthContext';
import { cores, espacos, fontes } from '../theme';
import { colunasDaGrade } from '../utils/colunas-da-grade';

interface AtalhoDoInicio {
  titulo: string;
  /** Frase completa lida pelo leitor de tela. */
  rotulo: string;
  icone: NomeDeIcone;
}

const ATALHOS_EM_BREVE: AtalhoDoInicio[] = [
  { titulo: 'Reportar problema', rotulo: 'Reportar um problema na rua', icone: 'camera-outline' },
  { titulo: 'Meus reportes', rotulo: 'Meus reportes', icone: 'list-outline' },
  { titulo: 'Contatos', rotulo: 'Contatos de emergência', icone: 'call-outline' },
];

// "A funcao X" concorda com qualquer nome (singular ou plural).
function avisarEmBreve(titulo: string) {
  Alert.alert('Em breve', `A função "${titulo}" ainda não está disponível.`);
}

export function TelaInicio() {
  const { sessao, logout } = useAuth();
  const router = useRouter();
  // Com a letra do sistema muito grande, os atalhos passam a ocupar a linha inteira.
  const { fontScale } = useWindowDimensions();
  const celula = colunasDaGrade(fontScale) === 1 ? styles.celulaInteira : styles.celula;

  return (
    <Tela>
      <View style={styles.cabecalho}>
        <Texto style={styles.saudacao}>Olá, {sessao?.usuario.nome}</Texto>
        <Texto style={styles.titulo} accessibilityRole="header">
          Voz & Via
        </Texto>
      </View>

      <BotaoMicrofone onPress={() => avisarEmBreve('Falar com o assistente')} />

      <View style={styles.grade}>
        {ATALHOS_EM_BREVE.map((atalho) => (
          <View key={atalho.rotulo} style={celula}>
            <AtalhoQuadrado
              titulo={atalho.titulo}
              rotulo={atalho.rotulo}
              icone={atalho.icone}
              onPress={() => avisarEmBreve(atalho.titulo)}
            />
          </View>
        ))}
        <View style={celula}>
          <AtalhoQuadrado
            titulo="Sobre o app"
            icone="information-circle-outline"
            onPress={() => router.push('/sobre')}
          />
        </View>
      </View>

      <Botao
        titulo="Pedir ajuda"
        variante="ajuda"
        grande
        icone="help-buoy-outline"
        onPress={() => avisarEmBreve('Pedir ajuda')}
      />

      <Botao
        titulo="Privacidade"
        rotulo="Política de privacidade"
        variante="secundario"
        onPress={() => router.push('/privacidade')}
      />
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
  cabecalho: { gap: 2 },
  saudacao: { fontSize: fontes.subtitulo, color: cores.textoSecundario },
  titulo: { fontSize: fontes.titulo, fontFamily: fontes.familia.negrito, color: cores.acao },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espacos.medio },
  // Duas colunas: cada celula ocupa quase metade da largura e cresce para dividir o resto.
  celula: { flexBasis: '45%', flexGrow: 1 },
  celulaInteira: { flexBasis: '100%' },
});
