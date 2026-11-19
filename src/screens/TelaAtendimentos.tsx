// Tela "Atendimento perto": a pessoa escolhe o tipo de lugar (hospital, UPA, posto de saude,
// farmacia, CRAS, delegacia, Defensoria), diz se precisa de acessibilidade e toca em buscar. So nesse
// toque o GPS e lido (privacidade, como no assistente); a lista e a mesma que o assistente mostra,
// com o caminho ate o mais perto, o "ligue 192" de hospital e UPA e o credito do OpenStreetMap.
// E o caminho por toque para quem nao quer ou nao consegue usar a voz.

import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao } from '../components/Botao';
import { CaixaConsentimento } from '../components/CaixaConsentimento';
import { ListaDeAtendimentos } from '../components/ListaDeAtendimentos';
import { SeletorDeOpcao, type OpcaoDoSeletor } from '../components/SeletorDeOpcao';
import { Tela } from '../components/Tela';
import { Texto } from '../components/Texto';
import { useApis } from '../contexts/ApisContext';
import { ehErroAparelho } from '../services/aparelho/erro-aparelho';
import { obterLocalizacao } from '../services/aparelho/localizacao';
import { ehErroApi } from '../services/api/erro';
import type { AtendimentosProximos, TipoAtendimento } from '../services/api/types';
import { cores, espacos, fontes } from '../theme';
import { useAnunciar } from '../utils/anunciar';

export const TIPOS_DE_ATENDIMENTO: OpcaoDoSeletor<TipoAtendimento>[] = [
  { valor: 'HOSPITAL', titulo: 'Hospital' },
  { valor: 'UPA', titulo: 'UPA' },
  { valor: 'UBS', titulo: 'Posto de saúde' },
  { valor: 'FARMACIA', titulo: 'Farmácia' },
  { valor: 'CRAS', titulo: 'CRAS' },
  { valor: 'DELEGACIA', titulo: 'Delegacia' },
  { valor: 'DEFENSORIA', titulo: 'Defensoria Pública' },
];

const MENSAGEM_ESCOLHA = 'Escolha o tipo de lugar.';
const MENSAGEM_SEM_GPS =
  'Não foi possível obter sua localização. Verifique se o GPS está ligado e tente de novo.';

function mensagemDeErroDaBusca(erro: unknown): string {
  if (ehErroAparelho(erro)) return erro.message;
  if (ehErroApi(erro)) {
    if (erro.status === 0) return 'Sem conexão. Verifique a internet e tente de novo.';
    if (erro.status === 401) return 'Sua sessão venceu. Entre de novo.';
    if (erro.status >= 500) return 'O servidor está com problemas. Tente de novo em instantes.';
    return 'Não foi possível buscar agora. Tente de novo.';
  }
  return MENSAGEM_SEM_GPS;
}

export function TelaAtendimentos() {
  const { atendimentos } = useApis();
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoAtendimento | null>(null);
  const [acessivel, setAcessivel] = useState(false);
  const [erroDoTipo, setErroDoTipo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useAnunciar(erro);
  const [buscando, setBuscando] = useState(false);
  const buscandoAgora = useRef(false);
  const [resultado, setResultado] = useState<AtendimentosProximos | null>(null);

  async function buscar() {
    if (buscandoAgora.current) return;
    if (!tipo) {
      setErroDoTipo(MENSAGEM_ESCOLHA);
      return;
    }
    buscandoAgora.current = true;
    setBuscando(true);
    setErro(null);
    setResultado(null);
    try {
      const ponto = await obterLocalizacao();
      setResultado(
        await atendimentos.proximos({
          tipo,
          latitude: ponto.latitude,
          longitude: ponto.longitude,
          acessivel,
        }),
      );
    } catch (falha) {
      setErro(mensagemDeErroDaBusca(falha));
    } finally {
      buscandoAgora.current = false;
      setBuscando(false);
    }
  }

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <Tela>
      <Texto style={styles.titulo} accessibilityRole="header">
        Atendimento perto
      </Texto>

      <SeletorDeOpcao
        rotulo="O que você procura?"
        opcoes={TIPOS_DE_ATENDIMENTO}
        valor={tipo}
        aoMudar={(novo) => {
          setTipo(novo);
          setErroDoTipo(null);
          setResultado(null);
        }}
        erro={erroDoTipo}
      />

      <CaixaConsentimento
        texto="Preciso de acessibilidade (cadeira de rodas, andador ou rampa)"
        marcada={acessivel}
        aoAlternar={() => {
          setAcessivel((atual) => !atual);
          setResultado(null);
        }}
      />

      <Texto style={styles.dica}>Sua localização é usada só nesta busca e não fica guardada.</Texto>

      <Botao
        titulo="Buscar perto de mim"
        rotulo="Buscar perto de mim usando a minha localização"
        icone="locate-outline"
        grande
        onPress={() => void buscar()}
        carregando={buscando}
      />

      {erro ? (
        <View style={styles.faixaErro} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Texto style={styles.textoErro}>{erro}</Texto>
        </View>
      ) : null}

      {resultado ? (
        <View style={styles.resultado} accessibilityLiveRegion="polite">
          <Texto style={styles.resposta}>{resultado.mensagemFalada}</Texto>
          <ListaDeAtendimentos dados={resultado} />
        </View>
      ) : null}

      <Botao titulo="Voltar" variante="secundario" onPress={voltar} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: fontes.titulo, fontFamily: fontes.familia.negrito, color: cores.texto },
  dica: { fontSize: fontes.corpo, color: cores.textoSecundario },
  resultado: { gap: espacos.medio },
  resposta: { fontSize: fontes.subtitulo, color: cores.texto },
  faixaErro: {
    padding: espacos.medio,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: cores.erro,
    backgroundColor: cores.fundoErro,
  },
  textoErro: { fontSize: fontes.corpo, color: cores.erro },
});
