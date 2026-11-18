// Tela "Contatos de emergencia": lista os contatos da pessoa, 10 por vez, por prioridade.
//  - "Ver mais" (em vez de rolagem infinita): um botao e mais facil de achar e de acionar com
//    leitor de tela e com tremor nas maos. Se a proxima pagina falhar, a lista continua na tela.
//  - A lista recarrega toda vez que a tela volta ao foco, para mostrar o que mudou (ex.: um
//    contato recem-cadastrado).
//  - Ao juntar paginas, contatos repetidos sao descartados: se entrar um contato novo enquanto
//    a pessoa le, as paginas "andam" e o mesmo contato poderia vir duas vezes.

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Botao } from '../components/Botao';
import { CartaoContato } from '../components/CartaoContato';
import { Tela } from '../components/Tela';
import { Texto } from '../components/Texto';
import { useApis } from '../contexts/ApisContext';
import { useAuth } from '../contexts/AuthContext';
import type { Contato } from '../services/api/types';
import { cores, espacos, fontes, IDIOMA_DO_APP } from '../theme';
import { useAnunciar } from '../utils/anunciar';
import { ligarPara } from '../utils/ligar-para';
import { mensagemDeErroAoCarregarContatos } from '../utils/mensagem-de-erro';

const TAMANHO_DA_PAGINA = 10;
// Maximo de contatos por perfil no Java (409 no 11o).
const MAXIMO_DE_CONTATOS = 10;

// No Java, GET /perfis-emergencia/meu so aceita CIDADAO (403 para o cuidador). Por isso o cuidador
// nem chega a consultar a lista: ve um aviso em vez de um erro.
export function TelaContatos() {
  const { status, sessao } = useAuth();
  // Enquanto o app le a sessao do cofre ainda nao se sabe o papel: nao consulta a API antes disso.
  if (status === 'carregando') return null;
  if (sessao?.usuario.role === 'CUIDADOR') return <AvisoDoCuidador />;
  return <ListaDeContatos />;
}

function AvisoDoCuidador() {
  const router = useRouter();
  return (
    <Tela>
      <Texto style={styles.titulo} accessibilityRole="header">
        Contatos de emergência
      </Texto>
      <Texto style={styles.aviso}>
        Esta tela mostra os contatos de quem usa o app como cidadão. Em breve você poderá gerenciar
        os contatos das pessoas que acompanha.
      </Texto>
      <Botao
        titulo="Voltar"
        variante="secundario"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
    </Tela>
  );
}

function ListaDeContatos() {
  const { contatos, perfis } = useApis();
  const router = useRouter();

  // null = ainda nao se sabe; false = a pessoa nao criou o perfil (no Java os contatos ficam
  // dentro do perfil, entao sem perfil nao da para cadastrar contato).
  const [temPerfil, setTemPerfil] = useState<boolean | null>(null);
  const [itens, setItens] = useState<Contato[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [temMais, setTemMais] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  useAnunciar(erro);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erroMais, setErroMais] = useState<string | null>(null);
  useAnunciar(erroMais);
  // true enquanto a primeira pagina recarrega: segura o "Ver mais" (ver carregar).
  const [recarregando, setRecarregando] = useState(false);

  // "Geracao" da lista: sobe a cada recarregamento e quando a tela perde o foco. Uma resposta so
  // vale se a geracao ainda for a mesma de quando o pedido saiu; senao a lista nova seria
  // sobrescrita por uma resposta antiga (ex.: "Ver mais" lento + editar um contato + voltar).
  const geracao = useRef(0);

  // Busca a primeira pagina. Usada ao entrar na tela, ao voltar a ela e no "Tentar de novo".
  const carregar = useCallback(async () => {
    const minha = ++geracao.current;
    // O "Ver mais" pendente deixa de valer; limpa o indicador dele aqui, pois a resposta antiga
    // nao pode mais fazer isso (e a recarga pode falhar).
    setCarregandoMais(false);
    // Um "Ver mais" feito agora usaria a lista antiga e, ao chegar depois da recarga, a
    // sobrescreveria; por isso o botao fica desabilitado ate a recarga terminar.
    setRecarregando(true);
    try {
      const resposta = await contatos.listar(1, TAMANHO_DA_PAGINA);
      if (minha !== geracao.current) return;
      // Lista com contatos prova que ha perfil. Lista vazia pode ser "sem perfil" (o Java devolve
      // 404 e o app mostra vazio) ou "perfil sem contatos": so ai pergunta ao perfil.
      const ha = resposta.total > 0 ? true : (await perfis.meu()) !== null;
      if (minha !== geracao.current) return;
      setTemPerfil(ha);
      setItens(resposta.itens);
      setTotal(resposta.total);
      setPagina(1);
      setTemMais(resposta.itens.length < resposta.total);
      setErro(null);
      setErroMais(null);
    } catch (falha) {
      if (minha !== geracao.current) return;
      setErro(mensagemDeErroAoCarregarContatos(falha));
    } finally {
      if (minha === geracao.current) {
        setCarregando(false);
        setRecarregando(false);
      }
    }
  }, [contatos, perfis]);

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
      const resposta = await contatos.listar(proxima, TAMANHO_DA_PAGINA);
      if (minha !== geracao.current) return;
      const ids = new Set(itens.map((item) => item.id));
      const juntos = [...itens, ...resposta.itens.filter((item) => !ids.has(item.id))];
      setItens(juntos);
      setTotal(resposta.total);
      setPagina(proxima);
      // Pagina vazia = acabou, mesmo que o total diga o contrario (evita um "Ver mais" infinito).
      setTemMais(resposta.itens.length > 0 && juntos.length < resposta.total);
    } catch (falha) {
      if (minha === geracao.current) setErroMais(mensagemDeErroAoCarregarContatos(falha));
    } finally {
      if (minha === geracao.current) setCarregandoMais(false);
    }
  }

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  const listaPronta = !carregando && !erro;
  const semPerfil = listaPronta && temPerfil === false;
  const comPerfil = listaPronta && temPerfil === true;
  const vazia = comPerfil && itens.length === 0;
  const limiteAtingido = comPerfil && total >= MAXIMO_DE_CONTATOS;
  const podeAdicionar = comPerfil && total < MAXIMO_DE_CONTATOS;

  return (
    <Tela>
      <Texto style={styles.titulo} accessibilityRole="header">
        Contatos de emergência
      </Texto>
      {/* Desde 16/11/2026 o Java deixa o cidadao gerir os proprios contatos (ate 10). */}
      {podeAdicionar ? (
        <Botao
          titulo="Novo contato"
          icone="add-circle-outline"
          onPress={() => router.push('/contatos/novo')}
        />
      ) : null}
      {comPerfil ? (
        <Botao
          titulo="Meu perfil"
          variante="secundario"
          icone="person-circle-outline"
          onPress={() => router.push('/perfil')}
        />
      ) : null}
      {semPerfil ? (
        <>
          <Texto style={styles.aviso}>
            Para cadastrar contatos, crie primeiro seu perfil de emergência.
          </Texto>
          <Botao
            titulo="Criar meu perfil de emergência"
            icone="person-add-outline"
            onPress={() => router.push('/perfil')}
          />
        </>
      ) : null}
      {limiteAtingido ? (
        <Texto style={styles.aviso}>Você já tem 10 contatos. Exclua um para adicionar outro.</Texto>
      ) : null}

      {carregando ? (
        <View style={styles.carregando}>
          <ActivityIndicator
            color={cores.acao}
            accessibilityLabel="Carregando contatos"
            accessibilityLanguage={IDIOMA_DO_APP}
          />
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

      {vazia ? (
        <Texto style={styles.aviso}>Você ainda não tem contatos de emergência cadastrados.</Texto>
      ) : null}

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
          desabilitado={recarregando}
        />
      ) : null}

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
