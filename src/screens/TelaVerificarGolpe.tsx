// Tela "É golpe?": separa as duas ajudas de golpe, que pedem coisas diferentes.
//  - Conferir uma mensagem: a pessoa cola (ou o assistente ja preenche) o texto que RECEBEU, diz por
//    onde chegou e toca em verificar. O parecer vem do Java (POST /api/v1/verificacoes); o texto nao
//    e gravado.
//  - "Já caí num golpe": nao ha o que conferir. A pessoa precisa do que fazer AGORA (banco, devolucao
//    do Pix pelo MED, boletim de ocorrencia). A orientacao vem da base oficial do Java.
// Nada e enviado sem o toque da pessoa.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao } from '../components/Botao';
import { CampoTexto } from '../components/CampoTexto';
import { CartaoOrientacao } from '../components/CartaoOrientacao';
import { CartaoVerificacao } from '../components/CartaoVerificacao';
import { SeletorDeOpcao, type OpcaoDoSeletor } from '../components/SeletorDeOpcao';
import { Tela } from '../components/Tela';
import { Texto } from '../components/Texto';
import { useApis } from '../contexts/ApisContext';
import type {
  CanalMensagem,
  RespostaAssistente,
  ResultadoVerificacao,
} from '../services/api/types';
import { cores, espacos, fontes } from '../theme';
import { useAnunciar } from '../utils/anunciar';

const CANAIS: OpcaoDoSeletor<CanalMensagem>[] = [
  { valor: 'WHATSAPP', titulo: 'WhatsApp' },
  { valor: 'SMS', titulo: 'SMS' },
  { valor: 'LIGACAO', titulo: 'Ligação' },
  { valor: 'EMAIL', titulo: 'E-mail' },
  { valor: 'OUTRO', titulo: 'Outro' },
];

// Limite do Java (VerificacaoRequest.texto).
const MAX_LETRAS = 2000;
const MENSAGEM_VAZIA = 'Cole ou escreva a mensagem que você recebeu.';
const MENSAGEM_LONGA = `A mensagem é longa demais. Envie até ${MAX_LETRAS} letras.`;
const MENSAGEM_FALHA = 'Não foi possível verificar agora. Verifique a internet e tente de novo.';
// A pergunta vai ao assistente, que responde com a orientacao oficial de quem caiu num golpe.
const PEDIDO_DE_QUEM_CAIU = 'Caí num golpe. O que eu faço agora?';

export function TelaVerificarGolpe() {
  const { assistente } = useApis();
  const router = useRouter();
  const parametros = useLocalSearchParams<{ texto?: string }>();
  const [texto, setTexto] = useState(typeof parametros.texto === 'string' ? parametros.texto : '');
  const [canal, setCanal] = useState<CanalMensagem | null>(null);
  const [erroDoCampo, setErroDoCampo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useAnunciar(erro);
  const [ocupado, setOcupado] = useState(false);
  const ocupadoAgora = useRef(false);
  const [parecer, setParecer] = useState<ResultadoVerificacao | null>(null);
  const [ajuda, setAjuda] = useState<RespostaAssistente | null>(null);

  async function executar(acao: () => Promise<void>) {
    if (ocupadoAgora.current) return;
    ocupadoAgora.current = true;
    setOcupado(true);
    setErro(null);
    try {
      await acao();
    } catch {
      setErro(MENSAGEM_FALHA);
    } finally {
      ocupadoAgora.current = false;
      setOcupado(false);
    }
  }

  function verificar() {
    const limpo = texto.trim();
    if (!limpo) {
      setErroDoCampo(MENSAGEM_VAZIA);
      return;
    }
    if (limpo.length > MAX_LETRAS) {
      setErroDoCampo(MENSAGEM_LONGA);
      return;
    }
    void executar(async () => {
      setAjuda(null);
      setParecer(await assistente.verificarMensagem({ texto: limpo, ...(canal ? { canal } : {}) }));
    });
  }

  function jaCaiNumGolpe() {
    void executar(async () => {
      setParecer(null);
      setAjuda(await assistente.interpretar({ texto: PEDIDO_DE_QUEM_CAIU }));
    });
  }

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <Tela>
      <Texto style={styles.titulo} accessibilityRole="header">
        É golpe?
      </Texto>
      <Texto style={styles.dica}>
        Cole aqui a mensagem que você recebeu. Ela é conferida e não fica guardada.
      </Texto>

      <CampoTexto
        rotulo="Mensagem recebida"
        valor={texto}
        aoMudar={(novo) => {
          setTexto(novo);
          setErroDoCampo(null);
          setParecer(null);
        }}
        erro={erroDoCampo}
        multilinha
      />

      <SeletorDeOpcao
        rotulo="Por onde chegou? (opcional)"
        opcoes={CANAIS}
        valor={canal}
        aoMudar={setCanal}
      />

      <Botao
        titulo="Verificar a mensagem"
        icone="shield-checkmark-outline"
        grande
        onPress={verificar}
        carregando={ocupado && !ajuda}
      />

      {erro ? (
        <View style={styles.faixaErro} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Texto style={styles.textoErro}>{erro}</Texto>
        </View>
      ) : null}

      {parecer ? <CartaoVerificacao resultado={parecer} /> : null}

      <View style={styles.separador}>
        <Texto style={styles.subtitulo}>Já caiu num golpe?</Texto>
        <Texto style={styles.dica}>
          Se você já passou senha, código ou fez um Pix, veja o que fazer agora.
        </Texto>
        <Botao
          titulo="Já caí num golpe"
          rotulo="Já caí num golpe: o que fazer agora"
          variante="ajuda"
          icone="warning-outline"
          onPress={jaCaiNumGolpe}
        />
      </View>

      {ajuda ? (
        <View style={styles.resultado} accessibilityLiveRegion="polite">
          <Texto style={styles.resposta}>{ajuda.mensagemFalada}</Texto>
          {ajuda.orientacao ? <CartaoOrientacao orientacao={ajuda.orientacao} /> : null}
        </View>
      ) : null}

      <Botao titulo="Voltar" variante="secundario" onPress={voltar} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: fontes.titulo, fontFamily: fontes.familia.negrito, color: cores.texto },
  subtitulo: { fontSize: fontes.subtitulo, fontFamily: fontes.familia.negrito, color: cores.texto },
  dica: { fontSize: fontes.corpo, color: cores.textoSecundario },
  resposta: { fontSize: fontes.subtitulo, color: cores.texto },
  resultado: { gap: espacos.medio },
  separador: {
    gap: espacos.pequeno,
    paddingTop: espacos.medio,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  faixaErro: {
    padding: espacos.medio,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: cores.erro,
    backgroundColor: cores.fundoErro,
  },
  textoErro: { fontSize: fontes.corpo, color: cores.erro },
});
