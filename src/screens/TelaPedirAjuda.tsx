// Tela "Pedir ajuda" (botao terracota da Inicio): avisa os contatos de emergencia com a localizacao,
// pela API Java (POST /api/v1/emergencias, que segue pela fila do RabbitMQ). Regra de seguranca do
// plano unico (secao 4.2): nada sai sem a pessoa confirmar, por isso o aviso so vai no toque em
// "Sim, avisar meus contatos". O "Ligar 192" fica sempre a um toque, antes e depois, e nunca
// fingimos que avisamos alguem: se a API falhar, a tela diz isso e manda ligar para o SAMU.

import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao } from '../components/Botao';
import { BotaoLigarEmergencia } from '../components/ListaDeAtendimentos';
import { Tela } from '../components/Tela';
import { Texto } from '../components/Texto';
import { useApis } from '../contexts/ApisContext';
import { obterLocalizacao } from '../services/aparelho/localizacao';
import type { RespostaAssistente } from '../services/api/types';
import {
  executarIntencao,
  type ResultadoDaExecucao,
} from '../services/assistente/executar-intencao';
import { cores, espacos, fontes } from '../theme';
import { useAnunciar } from '../utils/anunciar';

const SAMU = '192';
const TEXTO_DO_BOTAO = 'Pedido de ajuda pelo botão do app';

// O mesmo caminho do socorro por voz (executarIntencao): GPS opcional, aviso aos contatos e, se
// falhar, a orientacao de ligar para o SAMU.
const PEDIDO_DE_SOCORRO: RespostaAssistente = {
  intencao: 'SOCORRO',
  urgencia: 'CRITICA',
  entidades: {
    tipoAtendimento: null,
    exigeAcessibilidade: null,
    problemaRua: null,
    impedeCadeirante: null,
    referenciaLocal: null,
  },
  mensagemFalada: '',
  confianca: 1,
  analisadoPor: 'REGRAS',
  atendimentos: null,
  orientacao: null,
};

export function TelaPedirAjuda() {
  const { assistente } = useApis();
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const enviandoAgora = useRef(false);
  const [resultado, setResultado] = useState<ResultadoDaExecucao | null>(null);
  const aviso = resultado?.tipo === 'aviso' ? resultado.mensagem : null;
  useAnunciar(aviso);

  async function avisar() {
    if (enviandoAgora.current) return;
    enviandoAgora.current = true;
    setEnviando(true);
    try {
      setResultado(
        await executarIntencao(PEDIDO_DE_SOCORRO, TEXTO_DO_BOTAO, {
          assistente,
          obterLocalizacao,
          navegar: () => {},
        }),
      );
    } finally {
      enviandoAgora.current = false;
      setEnviando(false);
    }
  }

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <Tela>
      <Texto style={styles.titulo} accessibilityRole="header">
        Pedir ajuda
      </Texto>

      {resultado?.tipo === 'emergencia' ? (
        <View style={styles.cartao} accessibilityLiveRegion="polite">
          <Texto style={styles.resposta}>{resultado.resultado.mensagemFalada}</Texto>
          <Texto style={styles.destaque}>
            {`Contatos avisados: ${resultado.resultado.contatosNotificados}`}
          </Texto>
          <Texto style={styles.texto}>Se for urgência, ligue também para o SAMU.</Texto>
        </View>
      ) : (
        <>
          <Texto style={styles.texto}>
            Vamos avisar seus contatos de emergência que você precisa de ajuda, com a sua
            localização e as informações do seu perfil de emergência.
          </Texto>
          <Botao
            titulo="Sim, avisar meus contatos"
            variante="ajuda"
            icone="help-buoy-outline"
            grande
            onPress={() => void avisar()}
            carregando={enviando}
          />
        </>
      )}

      {aviso ? (
        <View style={styles.faixaErro} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Texto style={styles.textoErro}>{aviso}</Texto>
        </View>
      ) : null}

      <BotaoLigarEmergencia telefone={SAMU} />

      <Botao titulo="Voltar" variante="secundario" onPress={voltar} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: fontes.titulo, fontFamily: fontes.familia.negrito, color: cores.texto },
  texto: { fontSize: fontes.corpo, color: cores.texto },
  resposta: { fontSize: fontes.subtitulo, color: cores.texto },
  destaque: { fontSize: fontes.corpo, fontFamily: fontes.familia.negrito, color: cores.texto },
  cartao: {
    gap: espacos.medio,
    padding: espacos.medio,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: cores.acao,
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
