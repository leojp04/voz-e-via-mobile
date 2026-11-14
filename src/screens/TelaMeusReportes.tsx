// Tela "Meus reportes": lista os reportes da pessoa, 10 por vez, do mais novo ao mais antigo.
//  - "Ver mais" (em vez de rolagem infinita): um botao e mais facil de achar e de acionar com
//    leitor de tela e com tremor nas maos. Se a proxima pagina falhar, a lista continua na tela.
//  - A lista recarrega toda vez que a tela volta ao foco, para mostrar o que mudou no detalhe
//    (ex.: reporte cancelado) ou um reporte recem-criado.
//  - Ao juntar paginas, reportes repetidos sao descartados: se entrar um reporte novo enquanto
//    a pessoa le, as paginas "andam" e o mesmo reporte poderia vir duas vezes.

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Botao } from '../components/Botao';
import { CartaoReporte } from '../components/CartaoReporte';
import { Tela } from '../components/Tela';
import { Texto } from '../components/Texto';
import { useApis } from '../contexts/ApisContext';
import type { ReporteResumo } from '../services/api/types';
import { cores, espacos, fontes } from '../theme';
import { mensagemDeErroAoCarregar } from '../utils/mensagem-de-erro';

const TAMANHO_DA_PAGINA = 10;

export function TelaMeusReportes() {
  const { reportes } = useApis();
  const router = useRouter();

  const [itens, setItens] = useState<ReporteResumo[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [temMais, setTemMais] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erroMais, setErroMais] = useState<string | null>(null);

  // "Geracao" da lista: sobe a cada recarregamento e quando a tela perde o foco. Uma resposta so
  // vale se a geracao ainda for a mesma de quando o pedido saiu; senao a lista nova seria
  // sobrescrita por uma resposta antiga (ex.: "Ver mais" lento + abrir um reporte + voltar).
  const geracao = useRef(0);

  // Busca a primeira pagina. Usada ao entrar na tela, ao voltar a ela e no "Tentar de novo".
  const carregar = useCallback(async () => {
    const minha = ++geracao.current;
    try {
      const resposta = await reportes.listarMeus(1, TAMANHO_DA_PAGINA);
      if (minha !== geracao.current) return;
      setCarregandoMais(false);
      setItens(resposta.itens);
      setTotal(resposta.total);
      setPagina(1);
      setTemMais(resposta.itens.length < resposta.total);
      setErro(null);
      setErroMais(null);
    } catch (falha) {
      if (minha !== geracao.current) return;
      setErro(mensagemDeErroAoCarregar(falha));
    } finally {
      if (minha === geracao.current) setCarregando(false);
    }
  }, [reportes]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
      // Ao perder o foco, respostas que ainda estao a caminho deixam de valer.
      return () => {
        geracao.current++;
      };
    }, [carregar]),
  );

  async function carregarMais() {
    const minha = geracao.current;
    setErroMais(null);
    setCarregandoMais(true);
    try {
      const proxima = pagina + 1;
      const resposta = await reportes.listarMeus(proxima, TAMANHO_DA_PAGINA);
      if (minha !== geracao.current) return;
      const ids = new Set(itens.map((item) => item.id));
      const juntos = [...itens, ...resposta.itens.filter((item) => !ids.has(item.id))];
      setItens(juntos);
      setTotal(resposta.total);
      setPagina(proxima);
      // Pagina vazia = acabou, mesmo que o total diga o contrario (evita um "Ver mais" infinito).
      setTemMais(resposta.itens.length > 0 && juntos.length < resposta.total);
    } catch (falha) {
      if (minha === geracao.current) setErroMais(mensagemDeErroAoCarregar(falha));
    } finally {
      if (minha === geracao.current) setCarregandoMais(false);
    }
  }

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  const vazia = !carregando && !erro && itens.length === 0;

  return (
    <Tela>
      <Texto style={styles.titulo} accessibilityRole="header">
        Meus reportes
      </Texto>

      {carregando ? (
        <View style={styles.carregando}>
          <ActivityIndicator color={cores.acao} accessibilityLabel="Carregando reportes" />
          <Texto style={styles.aviso}>Carregando reportes…</Texto>
        </View>
      ) : null}

      {erro ? (
        <>
          <View style={styles.faixaErro} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Texto style={styles.textoErro}>{erro}</Texto>
          </View>
          <Botao
            titulo="Tentar de novo"
            variante="secundario"
            onPress={() => {
              setErro(null);
              setCarregando(true);
              void carregar();
            }}
          />
        </>
      ) : null}

      {vazia ? <Texto style={styles.aviso}>Você ainda não fez nenhum reporte.</Texto> : null}

      {itens.length > 0 ? (
        <Texto style={styles.aviso}>{total === 1 ? '1 reporte' : `${total} reportes`}</Texto>
      ) : null}
      {itens.map((item) => (
        <CartaoReporte
          key={item.id}
          reporte={item}
          aoAbrir={() => router.push(`/reportes/${item.id}`)}
        />
      ))}

      {erroMais ? (
        <View style={styles.faixaErro} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Texto style={styles.textoErro}>{erroMais}</Texto>
        </View>
      ) : null}
      {temMais ? (
        <Botao
          titulo="Ver mais"
          variante="secundario"
          onPress={() => void carregarMais()}
          carregando={carregandoMais}
        />
      ) : null}

      <Botao titulo="Fazer um novo reporte" onPress={() => router.push('/reportes/novo')} />
      <Botao titulo="Voltar" variante="secundario" onPress={voltar} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: fontes.titulo, fontFamily: fontes.familia.negrito, color: cores.texto },
  aviso: { fontSize: fontes.corpo, color: cores.textoSecundario },
  carregando: { flexDirection: 'row', alignItems: 'center', gap: espacos.pequeno },
  faixaErro: {
    padding: espacos.medio,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: cores.erro,
    backgroundColor: cores.fundoErro,
  },
  textoErro: { fontSize: fontes.corpo, color: cores.erro },
});
