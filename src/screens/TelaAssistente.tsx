// Tela do Assistente: a pessoa fala (microfone) ou digita, e a resposta pode ser lida em voz alta.
// A fala so PREENCHE o campo; quem envia e a pessoa, depois de conferir. A API interpreta e a
// tela MOSTRA o que entendeu. Regra de seguranca do
// plano unico (secao 4.2): a IA nunca executa nada sozinha. Quando a resposta pede confirmacao,
// so um toque em "Sim, confirmar" libera a acao; mexer no texto apaga a sugestao antiga, para
// ninguem confirmar uma coisa que ja nao e o que esta escrito. Mesmo quando a API nao pede
// confirmacao, qualquer intencao que AGE (liga, abre mapa ou outra tela) espera esse toque.

import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao } from '../components/Botao';
import { BotaoMicrofone } from '../components/BotaoMicrofone';
import { CaixaConsentimento } from '../components/CaixaConsentimento';
import { CampoTexto } from '../components/CampoTexto';
import { Tela } from '../components/Tela';
import { Texto } from '../components/Texto';
import { useApis } from '../contexts/ApisContext';
import { obterLocalizacao } from '../services/aparelho/localizacao';
import type { RespostaAssistente } from '../services/api/types';
import { executarIntencao, intencaoTemAcao } from '../services/assistente/executar-intencao';
import { falar, pararDeFalar } from '../services/voz/falar';
import { useEscutaDeVoz } from '../services/voz/use-escuta-de-voz';
import { cores, espacos, fontes } from '../theme';
import { ligarPara } from '../utils/ligar-para';
import { mensagemDeErroDoAssistente } from '../utils/mensagem-de-erro';
import { abrirBuscaNoMapa } from '../utils/url-do-mapa';

const MENSAGEM_TEXTO_VAZIO = 'Escreva o que você precisa.';
const MENSAGEM_SEM_VOZ = 'Voz indisponível neste aparelho. Digite o que você precisa.';
// Aviso antes de usar o reconhecedor do sistema (ver services/voz/reconhecimento.ts).
const TEXTO_DO_AVISO =
  'Este aparelho não entende voz sem internet. Para usar a voz, o serviço de fala da Apple ou do Google pode processar o seu áudio. O Voz & Via não recebe o áudio, só o texto. Você pode digitar se preferir.';

export function TelaAssistente() {
  const { assistente, contatos } = useApis();
  const router = useRouter();

  const [texto, setTexto] = useState('');
  const [erroDoCampo, setErroDoCampo] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [resposta, setResposta] = useState<RespostaAssistente | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const ocupadoAgora = useRef(false);
  const [executando, setExecutando] = useState(false);
  const executandoAgora = useRef(false);
  // "Ler sempre" ligado: toda resposta e lida. Desligado: so a de uma pergunta feita por voz.
  const [lerSempre, setLerSempre] = useState(true);
  const veioPorVoz = useRef(false);
  const voz = useEscutaDeVoz({ aoTexto: aoTextoFalado });

  // Sair da tela corta a leitura em andamento.
  useEffect(
    () => () => {
      void pararDeFalar();
    },
    [],
  );

  function aoTextoFalado(falado: string) {
    veioPorVoz.current = true;
    setTexto(falado);
    setErroDoCampo(null);
    // A sugestao antiga era de outro texto. A fala so preenche o campo: a pessoa confere e envia.
    setResposta(null);
    setAviso(null);
    void pararDeFalar();
  }

  function aoMudarTexto(novo: string) {
    veioPorVoz.current = false;
    void pararDeFalar();
    setTexto(novo);
    setErroDoCampo(null);
    // A sugestao (e o aviso da acao) eram do texto antigo: somem, para nao confundir.
    setResposta(null);
    setAviso(null);
  }

  async function enviar() {
    if (ocupadoAgora.current) return;
    const limpo = texto.trim();
    if (limpo.length === 0) {
      setErroDoCampo(MENSAGEM_TEXTO_VAZIO);
      return;
    }

    const porVoz = veioPorVoz.current;
    ocupadoAgora.current = true;
    setOcupado(true);
    setErroGeral(null);
    setAviso(null);
    setResposta(null);
    try {
      const nova = await assistente.interpretar({ texto: limpo });
      setResposta(nova);
      if (lerSempre || porVoz) void falar(nova.respostaFalada);
    } catch (falha) {
      setErroGeral(mensagemDeErroDoAssistente(falha));
    } finally {
      ocupadoAgora.current = false;
      setOcupado(false);
    }
  }

  async function confirmar() {
    if (!resposta || executandoAgora.current) return;
    void pararDeFalar();
    executandoAgora.current = true;
    setExecutando(true);
    try {
      const resultado = await executarIntencao(resposta, {
        contatos,
        ligarPara,
        abrirBuscaNoMapa,
        obterLocalizacao,
        navegar: (destino) => router.push(destino),
      });
      // Feita ou nao, a sugestao sai da tela: nao se confirma a mesma acao duas vezes.
      setResposta(null);
      setAviso(resultado.tipo === 'aviso' ? resultado.mensagem : null);
    } finally {
      executandoAgora.current = false;
      setExecutando(false);
    }
  }

  function voltar() {
    void pararDeFalar();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <Tela>
      <Texto style={styles.titulo} accessibilityRole="header">
        Assistente
      </Texto>

      {voz.disponivel ? (
        <BotaoMicrofone ouvindo={voz.ouvindo} onPress={() => void voz.alternar()} />
      ) : (
        <Texto style={styles.dicaSemVoz}>{MENSAGEM_SEM_VOZ}</Texto>
      )}

      {voz.precisaAviso ? (
        <View style={styles.cartao} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Texto style={styles.textoDoAviso}>{TEXTO_DO_AVISO}</Texto>
          <Botao titulo="Entendi, usar a voz" onPress={() => void voz.aceitarAviso()} />
          <Botao titulo="Prefiro digitar" variante="secundario" onPress={voz.recusarAviso} />
        </View>
      ) : null}

      {voz.erro ? (
        <View style={styles.faixaErro} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Texto style={styles.textoErro}>{voz.erro}</Texto>
        </View>
      ) : null}

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

      {aviso ? (
        <View style={styles.faixaErro} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Texto style={styles.textoErro}>{aviso}</Texto>
        </View>
      ) : null}

      {resposta ? (
        <View style={styles.cartao} accessibilityLiveRegion="polite">
          <Texto style={styles.resposta}>{resposta.respostaFalada}</Texto>
          {resposta.fontes.map((fonte) => (
            <Texto key={fonte} style={styles.fonte}>{`Fonte: ${fonte}`}</Texto>
          ))}
          <Botao
            titulo="Ouvir de novo"
            rotulo="Ouvir a resposta de novo"
            variante="secundario"
            icone="volume-high"
            onPress={() => void falar(resposta.respostaFalada)}
          />
          {resposta.precisaConfirmacao || intencaoTemAcao(resposta.intencao) ? (
            <View style={styles.confirmacao}>
              <Botao
                titulo="Sim, confirmar"
                grande
                onPress={() => void confirmar()}
                carregando={executando}
              />
              <Botao
                titulo="Não, cancelar"
                variante="secundario"
                onPress={() => {
                  void pararDeFalar();
                  setResposta(null);
                }}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      <CaixaConsentimento
        texto="Ler sempre a resposta em voz alta"
        marcada={lerSempre}
        aoAlternar={() => setLerSempre((atual) => !atual)}
      />

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
  dicaSemVoz: { fontSize: fontes.corpo, color: cores.textoSecundario },
  textoDoAviso: { fontSize: fontes.corpo, color: cores.texto },
  faixaErro: {
    padding: espacos.medio,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: cores.erro,
    backgroundColor: cores.fundoErro,
  },
  textoErro: { fontSize: fontes.corpo, color: cores.erro },
});
