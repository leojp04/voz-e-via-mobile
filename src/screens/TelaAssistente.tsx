// Tela do Assistente: a pessoa fala (microfone) ou digita, e a resposta pode ser lida em voz alta.
// A fala so PREENCHE o campo; quem envia e a pessoa, depois de conferir. O Java interpreta e a
// tela MOSTRA o que entendeu. Regra de seguranca do plano unico (secao 4.2): a IA nunca executa
// nada sozinha. Toda intencao que AGE (avisar contatos, verificar uma mensagem, abrir o formulario
// de reporte) espera o toque em "Sim, ...". Mexer no texto apaga a sugestao antiga, para ninguem
// confirmar uma coisa que ja nao e o que esta escrito.
// Privacidade: o GPS NUNCA vai junto do envio. Para BUSCAR_ATENDIMENTO o Java so traz a lista se
// receber a localizacao; quando ela falta, a tela oferece "Usar minha localizacao" e, so nesse
// toque, le o GPS e reenvia a MESMA frase. So oferece quando o Java ja sabe o TIPO de lugar: sem o
// tipo, a localizacao nao resolve e o pedido voltaria igual (era um loop). Numa duvida sobre servico
// publico (TIRAR_DUVIDA), a tela mostra a orientacao oficial e, se ela tiver atendimento presencial
// (ex.: CRAS), oferece buscar o mais perto do mesmo jeito.

import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao } from '../components/Botao';
import { BotaoMicrofone } from '../components/BotaoMicrofone';
import { CaixaConsentimento } from '../components/CaixaConsentimento';
import { CampoTexto } from '../components/CampoTexto';
import { CartaoOrientacao } from '../components/CartaoOrientacao';
import { BotaoLigarEmergencia, ListaDeAtendimentos } from '../components/ListaDeAtendimentos';
import { CartaoVerificacao } from '../components/CartaoVerificacao';
import { Tela } from '../components/Tela';
import { Texto } from '../components/Texto';
import { useApis } from '../contexts/ApisContext';
import { obterLocalizacao } from '../services/aparelho/localizacao';
import type { Intencao, RespostaAssistente, TipoAtendimento } from '../services/api/types';
import {
  executarIntencao,
  intencaoTemAcao,
  type ResultadoDaExecucao,
} from '../services/assistente/executar-intencao';
import { falar, pararDeFalar } from '../services/voz/falar';
import { useEscutaDeVoz } from '../services/voz/use-escuta-de-voz';
import { cores, espacos, fontes } from '../theme';
import { useAnunciar } from '../utils/anunciar';
import { mensagemDeErroDoAssistente } from '../utils/mensagem-de-erro';

const MENSAGEM_TEXTO_VAZIO = 'Escreva o que você precisa.';
// Limite do Java (IntencaoRequest.texto): acima disso a API devolve 400.
const MAX_LETRAS = 500;
const MENSAGEM_TEXTO_LONGO = `Escreva até ${MAX_LETRAS} letras.`;
const MENSAGEM_SEM_VOZ = 'Voz indisponível neste aparelho. Digite o que você precisa.';
const MENSAGEM_SEM_GPS =
  'Não foi possível obter sua localização. Verifique se o GPS está ligado e tente de novo.';
// Aviso antes de usar o reconhecedor do sistema (ver services/voz/reconhecimento.ts).
const TEXTO_DO_AVISO =
  'Este aparelho não reconhece a sua voz em português sem internet. Para usar a voz, o serviço de fala da Apple ou do Google pode processar o seu áudio. O Voz & Via não recebe o áudio, só o texto. Você pode digitar se preferir.';

const SAMU = '192';

const TITULO_DE_CONFIRMAR: Partial<Record<Intencao, string>> = {
  SOCORRO: 'Sim, avisar meus contatos',
  VERIFICAR_INFORMACAO: 'Sim, verificar',
  ZELADORIA_REPORT: 'Sim, abrir o formulário',
};

type ResultadoComCartao = Extract<ResultadoDaExecucao, { tipo: 'emergencia' | 'verificacao' }>;

const NOME_DO_LOCAL: Record<TipoAtendimento, string> = {
  HOSPITAL: 'o hospital',
  UPA: 'a UPA',
  UBS: 'o posto de saúde',
  FARMACIA: 'a farmácia',
  CRAS: 'o CRAS',
  DELEGACIA: 'a delegacia',
  DEFENSORIA: 'a Defensoria Pública',
};

/**
 * Que lugar a localizacao ajudaria a achar, ou null quando ela nao resolve nada (sem tipo, ou a lista
 * ja veio). Sem isso, "Usar minha localizacao" reenviava a mesma frase e voltava igual.
 */
export function localParaBuscar(resposta: RespostaAssistente): TipoAtendimento | null {
  if (resposta.atendimentos) return null;
  if (resposta.intencao === 'BUSCAR_ATENDIMENTO') return resposta.entidades.tipoAtendimento;
  if (resposta.intencao === 'TIRAR_DUVIDA') return resposta.orientacao?.localPresencial ?? null;
  return null;
}

export function TelaAssistente() {
  const { assistente } = useApis();
  const router = useRouter();

  const [texto, setTexto] = useState('');
  const [erroDoCampo, setErroDoCampo] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  useAnunciar(erroGeral);
  const [resposta, setResposta] = useState<RespostaAssistente | null>(null);
  const [resultado, setResultado] = useState<ResultadoComCartao | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  useAnunciar(aviso);
  // O alerta de socorro falhou: o botao de ligar para o SAMU tem de continuar a um toque.
  const [oferecerSamu, setOferecerSamu] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const ocupadoAgora = useRef(false);
  const [executando, setExecutando] = useState(false);
  const executandoAgora = useRef(false);
  const [lendoGps, setLendoGps] = useState(false);
  const lendoGpsAgora = useRef(false);
  // "Ler sempre" ligado: toda resposta e lida. Desligado: so a de uma pergunta feita por voz.
  const [lerSempre, setLerSempre] = useState(true);
  const veioPorVoz = useRef(false);
  const voz = useEscutaDeVoz({ aoTexto: aoTextoFalado });
  useAnunciar(voz.erro);

  // Sair da tela corta a leitura em andamento.
  useEffect(
    () => () => {
      void pararDeFalar();
    },
    [],
  );

  function limparResposta() {
    setResposta(null);
    setResultado(null);
    setAviso(null);
    setOferecerSamu(false);
  }

  function lerSeQuiser(frase: string) {
    if (lerSempre || veioPorVoz.current) void falar(frase);
  }

  function aoTextoFalado(falado: string) {
    veioPorVoz.current = true;
    setTexto(falado);
    setErroDoCampo(null);
    // A sugestao antiga era de outro texto. A fala so preenche o campo: a pessoa confere e envia.
    limparResposta();
    void pararDeFalar();
  }

  function aoMudarTexto(novo: string) {
    veioPorVoz.current = false;
    void pararDeFalar();
    setTexto(novo);
    setErroDoCampo(null);
    // A sugestao (e o aviso da acao) eram do texto antigo: somem, para nao confundir.
    limparResposta();
  }

  async function interpretar(limpo: string, ponto?: { latitude: number; longitude: number }) {
    if (ocupadoAgora.current) return;
    ocupadoAgora.current = true;
    setOcupado(true);
    setErroGeral(null);
    limparResposta();
    try {
      const nova = await assistente.interpretar({
        texto: limpo,
        ...(ponto ? { latitude: ponto.latitude, longitude: ponto.longitude } : {}),
      });
      setResposta(nova);
      lerSeQuiser(nova.mensagemFalada);
    } catch (falha) {
      setErroGeral(mensagemDeErroDoAssistente(falha));
    } finally {
      ocupadoAgora.current = false;
      setOcupado(false);
    }
  }

  async function enviar() {
    if (ocupadoAgora.current) return;
    const limpo = texto.trim();
    if (limpo.length === 0) {
      setErroDoCampo(MENSAGEM_TEXTO_VAZIO);
      return;
    }
    if (limpo.length > MAX_LETRAS) {
      setErroDoCampo(MENSAGEM_TEXTO_LONGO);
      return;
    }
    await interpretar(limpo);
  }

  // So aqui o GPS e lido: a pessoa tocou no botao. Reenvia a mesma frase, agora com o ponto.
  async function usarLocalizacao() {
    if (lendoGpsAgora.current || ocupadoAgora.current) return;
    lendoGpsAgora.current = true;
    setLendoGps(true);
    setAviso(null);
    try {
      const ponto = await obterLocalizacao();
      await interpretar(texto.trim(), ponto);
    } catch (falha) {
      setAviso(falha instanceof Error && falha.message ? falha.message : MENSAGEM_SEM_GPS);
    } finally {
      lendoGpsAgora.current = false;
      setLendoGps(false);
    }
  }

  async function confirmar() {
    if (!resposta || executandoAgora.current) return;
    void pararDeFalar();
    executandoAgora.current = true;
    setExecutando(true);
    try {
      const feito = await executarIntencao(resposta, texto, {
        assistente,
        obterLocalizacao,
        navegar: (destino) => router.push(destino),
      });
      // Feita ou nao, a sugestao sai da tela: nao se confirma a mesma acao duas vezes.
      setResposta(null);
      if (feito.tipo === 'aviso') {
        setAviso(feito.mensagem);
        setOferecerSamu(resposta.intencao === 'SOCORRO');
      } else if (feito.tipo === 'emergencia' || feito.tipo === 'verificacao') {
        setResultado(feito);
        lerSeQuiser(feito.resultado.mensagemFalada);
      }
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

  const tituloDeConfirmar = resposta ? TITULO_DE_CONFIRMAR[resposta.intencao] : undefined;
  const local = resposta ? localParaBuscar(resposta) : null;

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

      {oferecerSamu ? <BotaoLigarEmergencia telefone={SAMU} /> : null}

      {resposta ? (
        <View style={styles.cartao} accessibilityLiveRegion="polite">
          <Texto style={styles.resposta}>{resposta.mensagemFalada}</Texto>
          <Botao
            titulo="Ouvir de novo"
            rotulo="Ouvir a resposta de novo"
            variante="secundario"
            icone="volume-high"
            onPress={() => void falar(resposta.mensagemFalada)}
          />
          {intencaoTemAcao(resposta.intencao) && tituloDeConfirmar ? (
            <View style={styles.confirmacao}>
              <Botao
                titulo={tituloDeConfirmar}
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
          {local ? (
            <View style={styles.confirmacao}>
              <Texto style={styles.fonte}>
                {`Para mostrar ${NOME_DO_LOCAL[local]} mais perto de você, preciso da sua localização. Ela é usada só nesta busca.`}
              </Texto>
              <Botao
                titulo="Usar minha localização"
                rotulo={`Usar minha localização para achar ${NOME_DO_LOCAL[local]} mais perto`}
                icone="locate-outline"
                onPress={() => void usarLocalizacao()}
                carregando={lendoGps}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {resposta?.orientacao ? <CartaoOrientacao orientacao={resposta.orientacao} /> : null}

      {resposta?.atendimentos ? <ListaDeAtendimentos dados={resposta.atendimentos} /> : null}

      {resultado?.tipo === 'emergencia' ? (
        <View style={styles.cartao} accessibilityLiveRegion="polite">
          <Texto style={styles.resposta}>{resultado.resultado.mensagemFalada}</Texto>
          <Texto style={styles.destaque}>
            {`Contatos avisados: ${resultado.resultado.contatosNotificados}`}
          </Texto>
          <BotaoLigarEmergencia telefone={resultado.telefoneEmergencia} />
        </View>
      ) : null}

      {resultado?.tipo === 'verificacao' ? (
        <CartaoVerificacao resultado={resultado.resultado} />
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
  lista: { gap: espacos.medio },
  resposta: { fontSize: fontes.subtitulo, color: cores.texto },
  destaque: { fontSize: fontes.corpo, fontFamily: fontes.familia.negrito, color: cores.texto },
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
