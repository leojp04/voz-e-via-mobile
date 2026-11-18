// Tela "Novo reporte": a pessoa escolhe a categoria e a urgencia, descreve o problema, junta uma
// foto (opcional) e o ponto do GPS, e envia para a API .NET. Regras que protegem quem usa:
//  - O "Idempotency-Key" (UUID) nasce ao abrir a tela e e REUSADO em toda nova tentativa do mesmo
//    envio: toque duplo ou rede ruim nao criam dois reportes (plano unico, secao 8.2).
//  - A foto sobe primeiro (POST /api/fotos) e o reporte leva so a URL (docs/adr/0008). Se o
//    reporte falhar depois, a URL guardada evita subir a mesma foto de novo.
//  - Camera e GPS so sao pedidos quando a pessoa toca no botao (docs/adr/0009).
//  - O assistente por voz pode abrir a tela ja preenchida (parametros "categoria", "urgencia" e
//    "descricao" na rota). E so uma sugestao: a pessoa revisa, usa o GPS e toca em enviar.
// Toda mensagem diz se o reporte foi ou NAO enviado, para ninguem ficar na duvida.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { BlocoLocalizacao } from '../components/BlocoLocalizacao';
import { Botao } from '../components/Botao';
import { CampoDeFoto } from '../components/CampoDeFoto';
import { CampoTexto } from '../components/CampoTexto';
import { Protocolo } from '../components/Protocolo';
import { SeletorDeOpcao, type OpcaoDoSeletor } from '../components/SeletorDeOpcao';
import { Tela } from '../components/Tela';
import { Texto } from '../components/Texto';
import { useApis } from '../contexts/ApisContext';
import { escolherFotoDaGaleria, tirarFoto } from '../services/aparelho/camera';
import { ehErroAparelho } from '../services/aparelho/erro-aparelho';
import { obterLocalizacao, type LocalizacaoAtual } from '../services/aparelho/localizacao';
import { ehErroApi } from '../services/api/erro';
import type { ArquivoFoto, Categoria, Reporte, Urgencia } from '../services/api/types';
import { cores, espacos, fontes, IDIOMA_DO_APP } from '../theme';
import { useAnunciar } from '../utils/anunciar';
import { gerarUuid } from '../utils/gerar-uuid';
import { mensagemDeErroDaFoto, mensagemDeErroDoReporte } from '../utils/mensagem-de-erro';
import {
  validarCategoria,
  validarDescricaoDoReporte,
  validarLocalizacao,
  type Erro,
} from '../utils/validators';

const URGENCIAS: OpcaoDoSeletor<Urgencia>[] = [
  { valor: 'BAIXA', titulo: 'Baixa' },
  { valor: 'MEDIA', titulo: 'Média' },
  { valor: 'ALTA', titulo: 'Alta' },
];

const CODIGOS_DE_URGENCIA: readonly string[] = URGENCIAS.map((u) => u.valor);

/** Parametro de rota vem como texto ou lista; so o texto interessa. */
function textoDaRota(valor: string | string[] | undefined): string | undefined {
  return typeof valor === 'string' && valor.length > 0 ? valor : undefined;
}

const MENSAGEM_SEM_CATEGORIAS =
  'Não foi possível carregar as categorias. Verifique a internet e tente de novo.';
const MENSAGEM_FALHA_NA_FOTO = 'Não foi possível usar a foto. Tente de novo.';
const MENSAGEM_FALHA_NO_GPS = 'Não foi possível obter sua localização. Tente de novo.';

interface ErrosDoFormulario {
  categoria: Erro;
  descricao: Erro;
  localizacao: Erro;
}

const SEM_ERROS: ErrosDoFormulario = { categoria: null, descricao: null, localizacao: null };

export function TelaNovoReporte() {
  const { reportes, fotos } = useApis();
  const router = useRouter();
  const sugestao = useLocalSearchParams<{
    categoria?: string;
    urgencia?: string;
    descricao?: string;
  }>();
  const categoriaSugerida = textoDaRota(sugestao.categoria);
  const urgenciaSugerida = textoDaRota(sugestao.urgencia);

  const [categorias, setCategorias] = useState<Categoria[] | null>(null);
  const [erroCategorias, setErroCategorias] = useState<string | null>(null);
  useAnunciar(erroCategorias);
  const [tentativaDeCategorias, setTentativaDeCategorias] = useState(0);

  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [urgencia, setUrgencia] = useState<Urgencia>(
    urgenciaSugerida && CODIGOS_DE_URGENCIA.includes(urgenciaSugerida)
      ? (urgenciaSugerida as Urgencia)
      : 'MEDIA',
  );
  const [descricao, setDescricao] = useState(textoDaRota(sugestao.descricao) ?? '');
  const [foto, setFoto] = useState<ArquivoFoto | null>(null);
  // URL da foto ja enviada ao servidor; evita subir a mesma foto de novo numa nova tentativa.
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [localizacao, setLocalizacao] = useState<LocalizacaoAtual | null>(null);
  const [obtendoLocalizacao, setObtendoLocalizacao] = useState(false);
  const [erroLocalizacao, setErroLocalizacao] = useState<string | null>(null);

  const [erros, setErros] = useState<ErrosDoFormulario>(SEM_ERROS);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  useAnunciar(erroGeral);
  const [enviando, setEnviando] = useState(false);
  const enviandoAgora = useRef(false);
  const [criado, setCriado] = useState<Reporte | null>(null);
  const [chave, setChave] = useState(gerarUuid);

  useEffect(() => {
    let ativo = true;
    reportes
      .listarCategorias()
      .then((lista) => {
        if (!ativo) return;
        setCategorias(lista);
        setErroCategorias(null);
        // Sugestao do assistente: so vale se o codigo existir e a pessoa ainda nao escolheu.
        const sugerida = lista.find((c) => c.codigo === categoriaSugerida);
        if (sugerida) setCategoriaId((atual) => atual ?? sugerida.id);
      })
      .catch(() => {
        if (ativo) setErroCategorias(MENSAGEM_SEM_CATEGORIAS);
      });
    return () => {
      ativo = false;
    };
  }, [reportes, tentativaDeCategorias, categoriaSugerida]);

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function usarFoto(obter: () => Promise<ArquivoFoto | null>) {
    setErroFoto(null);
    try {
      const nova = await obter();
      if (nova) {
        setFoto(nova);
        setFotoUrl(null);
      }
    } catch (erro) {
      setErroFoto(ehErroAparelho(erro) ? erro.message : MENSAGEM_FALHA_NA_FOTO);
    }
  }

  async function usarLocalizacao() {
    setErroLocalizacao(null);
    setObtendoLocalizacao(true);
    try {
      setLocalizacao(await obterLocalizacao());
      setErros((atuais) => ({ ...atuais, localizacao: null }));
    } catch (erro) {
      setErroLocalizacao(ehErroAparelho(erro) ? erro.message : MENSAGEM_FALHA_NO_GPS);
    } finally {
      setObtendoLocalizacao(false);
    }
  }

  async function enviar() {
    if (enviandoAgora.current) return;
    const novosErros: ErrosDoFormulario = {
      categoria: validarCategoria(categoriaId),
      descricao: validarDescricaoDoReporte(descricao),
      localizacao: validarLocalizacao(localizacao !== null),
    };
    setErros(novosErros);
    setErroGeral(null);
    if (Object.values(novosErros).some(Boolean) || categoriaId === null || localizacao === null) {
      return;
    }

    enviandoAgora.current = true;
    setEnviando(true);
    try {
      let urlDaFoto = fotoUrl ?? undefined;
      if (foto && !urlDaFoto) {
        try {
          urlDaFoto = (await fotos.enviar(foto)).fotoUrl;
          setFotoUrl(urlDaFoto);
        } catch (erro) {
          setErroFoto(mensagemDeErroDaFoto(erro));
          return;
        }
      }
      setCriado(
        await reportes.criar(
          {
            categoriaId,
            descricao: descricao.trim(),
            latitude: localizacao.latitude,
            longitude: localizacao.longitude,
            endereco: localizacao.endereco,
            fotoUrl: urlDaFoto,
            urgencia,
          },
          chave,
        ),
      );
    } catch (erro) {
      if (ehErroApi(erro) && (erro.status === 400 || erro.status === 422)) {
        // O servidor apontou campos: a mensagem aparece junto de cada um.
        setErros({
          categoria: erro.campos.categoriaId ?? null,
          descricao: erro.campos.descricao ?? null,
          localizacao: erro.campos.latitude ?? erro.campos.longitude ?? null,
        });
      }
      setErroGeral(mensagemDeErroDoReporte(erro));
    } finally {
      enviandoAgora.current = false;
      setEnviando(false);
    }
  }

  function fazerOutro() {
    setCriado(null);
    setCategoriaId(null);
    setUrgencia('MEDIA');
    setDescricao('');
    setFoto(null);
    setFotoUrl(null);
    setErroFoto(null);
    setLocalizacao(null);
    setErroLocalizacao(null);
    setErros(SEM_ERROS);
    setErroGeral(null);
    // Reporte novo = chave nova; so um reenvio do MESMO reporte reusa a chave.
    setChave(gerarUuid());
  }

  if (criado) {
    return (
      <Tela>
        <Texto style={styles.titulo} accessibilityRole="header">
          Reporte enviado!
        </Texto>
        <Texto style={styles.aviso}>Protocolo:</Texto>
        <Protocolo valor={criado.protocolo} style={styles.protocolo} />
        <Texto style={styles.aviso}>Guarde este número para acompanhar o seu reporte.</Texto>
        <Botao titulo="Ver meus reportes" onPress={() => router.replace('/reportes')} />
        <Botao titulo="Fazer outro reporte" variante="secundario" onPress={fazerOutro} />
        <Botao
          titulo="Voltar ao início"
          variante="secundario"
          onPress={() => router.replace('/')}
        />
      </Tela>
    );
  }

  return (
    <Tela>
      <Texto style={styles.titulo} accessibilityRole="header">
        Novo reporte
      </Texto>

      {erroCategorias ? (
        <View style={styles.faixaErro} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Texto style={styles.textoErro}>{erroCategorias}</Texto>
        </View>
      ) : null}
      {erroCategorias ? (
        <Botao
          titulo="Tentar de novo"
          variante="secundario"
          onPress={() => {
            setErroCategorias(null);
            setTentativaDeCategorias((n) => n + 1);
          }}
        />
      ) : null}
      {categorias === null && !erroCategorias ? (
        <View style={styles.carregando}>
          <ActivityIndicator
            color={cores.acao}
            accessibilityLabel="Carregando categorias"
            accessibilityLanguage={IDIOMA_DO_APP}
          />
          <Texto style={styles.aviso}>Carregando categorias…</Texto>
        </View>
      ) : null}

      {categorias ? (
        <SeletorDeOpcao
          rotulo="Categoria"
          opcoes={categorias.map((c) => ({ valor: c.id, titulo: c.nome }))}
          valor={categoriaId}
          aoMudar={(id) => {
            setCategoriaId(id);
            setErros((atuais) => ({ ...atuais, categoria: null }));
          }}
          erro={erros.categoria}
        />
      ) : null}

      <SeletorDeOpcao rotulo="Urgência" opcoes={URGENCIAS} valor={urgencia} aoMudar={setUrgencia} />

      <CampoTexto
        rotulo="Descrição"
        valor={descricao}
        aoMudar={setDescricao}
        erro={erros.descricao}
        autoCapitalizar="sentences"
        multilinha
      />

      <CampoDeFoto
        foto={foto}
        aoTirarFoto={() => void usarFoto(tirarFoto)}
        aoEscolherDaGaleria={() => void usarFoto(escolherFotoDaGaleria)}
        aoRemover={() => {
          setFoto(null);
          setFotoUrl(null);
          setErroFoto(null);
        }}
        ocupado={enviando}
        erro={erroFoto}
      />

      <BlocoLocalizacao
        localizacao={localizacao}
        obtendo={obtendoLocalizacao}
        aoUsar={() => void usarLocalizacao()}
        erro={erroLocalizacao ?? erros.localizacao}
      />

      {erroGeral ? (
        <View style={styles.faixaErro} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Texto style={styles.textoErro}>{erroGeral}</Texto>
        </View>
      ) : null}

      <Botao titulo="Enviar reporte" onPress={() => void enviar()} carregando={enviando} />
      <Botao titulo="Voltar" variante="secundario" onPress={voltar} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: fontes.titulo, fontFamily: fontes.familia.negrito, color: cores.texto },
  protocolo: { fontSize: fontes.subtitulo, fontFamily: fontes.familia.negrito, color: cores.acao },
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
