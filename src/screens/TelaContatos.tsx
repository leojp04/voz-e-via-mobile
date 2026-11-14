// Tela "Contatos de emergencia": lista os contatos da pessoa, 10 por vez, por prioridade.
//  - "Ver mais" (em vez de rolagem infinita): um botao e mais facil de achar e de acionar com
//    leitor de tela e com tremor nas maos. Se a proxima pagina falhar, a lista continua na tela.
//  - A lista recarrega toda vez que a tela volta ao foco, para mostrar o que mudou (ex.: um
//    contato recem-cadastrado).
//  - Ao juntar paginas, contatos repetidos sao descartados: se entrar um contato novo enquanto
//    a pessoa le, as paginas "andam" e o mesmo contato poderia vir duas vezes.

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Botao } from '../components/Botao';
import { CartaoContato } from '../components/CartaoContato';
import { Tela } from '../components/Tela';
import { Texto } from '../components/Texto';
import { useApis } from '../contexts/ApisContext';
import type { Contato } from '../services/api/types';
import { cores, espacos, fontes } from '../theme';
import { ligarPara } from '../utils/ligar-para';
import { mensagemDeErroAoCarregar } from '../utils/mensagem-de-erro';

const TAMANHO_DA_PAGINA = 10;

export function TelaContatos() {
  const { contatos } = useApis();
  const router = useRouter();

  const [itens, setItens] = useState<Contato[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [temMais, setTemMais] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erroMais, setErroMais] = useState<string | null>(null);

  // Busca a primeira pagina. Usada ao entrar na tela, ao voltar a ela e no "Tentar de novo".
  const carregar = useCallback(async () => {
    try {
      const resposta = await contatos.listar(1, TAMANHO_DA_PAGINA);
      setItens(resposta.itens);
      setTotal(resposta.total);
      setPagina(1);
      setTemMais(resposta.itens.length < resposta.total);
      setErro(null);
      setErroMais(null);
    } catch (falha) {
      setErro(mensagemDeErroAoCarregar(falha));
    } finally {
      setCarregando(false);
    }
  }, [contatos]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  async function carregarMais() {
    setErroMais(null);
    setCarregandoMais(true);
    try {
      const proxima = pagina + 1;
      const resposta = await contatos.listar(proxima, TAMANHO_DA_PAGINA);
      const ids = new Set(itens.map((item) => item.id));
      const juntos = [...itens, ...resposta.itens.filter((item) => !ids.has(item.id))];
      setItens(juntos);
      setTotal(resposta.total);
      setPagina(proxima);
      // Pagina vazia = acabou, mesmo que o total diga o contrario (evita um "Ver mais" infinito).
      setTemMais(resposta.itens.length > 0 && juntos.length < resposta.total);
    } catch (falha) {
      setErroMais(mensagemDeErroAoCarregar(falha));
    } finally {
      setCarregandoMais(false);
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
        Contatos de emergência
      </Texto>

      {carregando ? (
        <View style={styles.carregando}>
          <ActivityIndicator color={cores.acao} accessibilityLabel="Carregando contatos" />
          <Texto style={styles.aviso}>Carregando contatos…</Texto>
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

      {vazia ? <Texto style={styles.aviso}>Você ainda não cadastrou nenhum contato.</Texto> : null}

      {itens.length > 0 ? (
        <Texto style={styles.aviso}>{total === 1 ? '1 contato' : `${total} contatos`}</Texto>
      ) : null}
      {itens.map((item) => (
        <CartaoContato
          key={item.id}
          contato={item}
          aoLigar={() => ligarPara(item.telefone)}
          aoEditar={() => router.push(`/contatos/${item.id}`)}
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

      <Botao titulo="Adicionar contato" onPress={() => router.push('/contatos/novo')} />
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
