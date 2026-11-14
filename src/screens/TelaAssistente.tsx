// Tela do Assistente (por enquanto so com texto digitado; a voz entra em outra etapa). A pessoa
// escreve o que precisa, a API interpreta e a tela MOSTRA o que entendeu. Regra de seguranca do
// plano unico (secao 4.2): a IA nunca executa nada sozinha. Quando a resposta pede confirmacao,
// so um toque em "Sim, confirmar" libera a acao; mexer no texto apaga a sugestao antiga, para
// ninguem confirmar uma coisa que ja nao e o que esta escrito.

import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Botao } from '../components/Botao';
import { CampoTexto } from '../components/CampoTexto';
import { Tela } from '../components/Tela';
import { Texto } from '../components/Texto';
import { useApis } from '../contexts/ApisContext';
import type { RespostaAssistente } from '../services/api/types';
import { cores, espacos, fontes } from '../theme';
import { mensagemDeErroDoAssistente } from '../utils/mensagem-de-erro';

const MENSAGEM_TEXTO_VAZIO = 'Escreva o que você precisa.';

export function TelaAssistente() {
  const { assistente } = useApis();
  const router = useRouter();

  const [texto, setTexto] = useState('');
  const [erroDoCampo, setErroDoCampo] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [resposta, setResposta] = useState<RespostaAssistente | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const ocupadoAgora = useRef(false);

  function aoMudarTexto(novo: string) {
    setTexto(novo);
    setErroDoCampo(null);
    // A sugestao era para o texto antigo: some, para nao ser confirmada por engano.
    setResposta(null);
  }

  async function enviar() {
    if (ocupadoAgora.current) return;
    const limpo = texto.trim();
    if (limpo.length === 0) {
      setErroDoCampo(MENSAGEM_TEXTO_VAZIO);
      return;
    }

    ocupadoAgora.current = true;
    setOcupado(true);
    setErroGeral(null);
    setResposta(null);
    try {
      setResposta(await assistente.interpretar({ texto: limpo }));
    } catch (falha) {
      setErroGeral(mensagemDeErroDoAssistente(falha));
    } finally {
      ocupadoAgora.current = false;
      setOcupado(false);
    }
  }

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <Tela>
      <Texto style={styles.titulo} accessibilityRole="header">
        Assistente
      </Texto>

      <CampoTexto
        rotulo="O que você precisa?"
        valor={texto}
        aoMudar={aoMudarTexto}
        erro={erroDoCampo}
        autoCapitalizar="sentences"
        multilinha
      />

      <Botao
        titulo="Enviar"
        rotulo="Enviar ao assistente"
        onPress={() => void enviar()}
        carregando={ocupado}
      />

      {erroGeral ? (
        <View style={styles.faixaErro} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Texto style={styles.textoErro}>{erroGeral}</Texto>
        </View>
      ) : null}

      {resposta ? (
        <View style={styles.cartao} accessibilityLiveRegion="polite">
          <Texto style={styles.resposta}>{resposta.respostaFalada}</Texto>
          {resposta.fontes.map((fonte) => (
            <Texto key={fonte} style={styles.fonte}>{`Fonte: ${fonte}`}</Texto>
          ))}
          {resposta.precisaConfirmacao ? (
            <View style={styles.confirmacao}>
              <Botao
                titulo="Sim, confirmar"
                grande
                onPress={() => Alert.alert('Em breve', 'Esta ação ainda não está disponível.')}
              />
              <Botao
                titulo="Não, cancelar"
                variante="secundario"
                onPress={() => setResposta(null)}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      <Botao titulo="Voltar" variante="secundario" onPress={voltar} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: fontes.titulo, fontFamily: fontes.familia.negrito, color: cores.texto },
  cartao: {
    gap: espacos.medio,
    padding: espacos.medio,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: cores.acao,
  },
  resposta: { fontSize: fontes.subtitulo, color: cores.texto },
  fonte: { fontSize: fontes.corpo, color: cores.textoSecundario },
  confirmacao: { gap: espacos.pequeno },
  faixaErro: {
    padding: espacos.medio,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: cores.erro,
    backgroundColor: cores.fundoErro,
  },
  textoErro: { fontSize: fontes.corpo, color: cores.erro },
});
