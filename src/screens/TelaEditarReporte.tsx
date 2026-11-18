// Tela "Editar reporte": so a descricao e a foto mudam (plano unico, secao 8.2), e so com o
// reporte ABERTO. Categoria, urgencia e local aparecem para leitura. Regras que protegem quem usa:
//  - A foto nova sobe primeiro (POST /api/fotos) e a edicao leva so a URL. Se a edicao falhar
//    depois, a URL guardada evita subir a mesma foto de novo na proxima tentativa.
//  - No PUT, fotoUrl ausente = manter a foto, null = remover, texto = trocar (a confirmar com o
//    time do .NET). Por isso a chave so entra no corpo quando a pessoa mexeu na foto.
//  - Toda mensagem diz se as mudancas foram ou NAO salvas.
// O servidor e quem decide de verdade: se o status mudou, responde 409 e a tela explica.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Botao } from '../components/Botao';
import { CampoDeFoto } from '../components/CampoDeFoto';
import { CampoTexto } from '../components/CampoTexto';
import { Protocolo } from '../components/Protocolo';
import { Tela } from '../components/Tela';
import { Texto } from '../components/Texto';
import { useApis } from '../contexts/ApisContext';
import { escolherFotoDaGaleria, tirarFoto } from '../services/aparelho/camera';
import { ehErroAparelho } from '../services/aparelho/erro-aparelho';
import { ehErroApi } from '../services/api/erro';
import type { ArquivoFoto, DadosEdicaoReporte, Reporte } from '../services/api/types';
import { cores, espacos, fontes, IDIOMA_DO_APP } from '../theme';
import {
  mensagemDeErroAoCarregar,
  mensagemDeErroAoEditar,
  mensagemDeErroDaFoto,
} from '../utils/mensagem-de-erro';
import { useAnunciar } from '../utils/anunciar';
import { rotuloDaUrgencia } from '../utils/status-do-reporte';
import { validarDescricaoDoReporte, type Erro } from '../utils/validators';

const MENSAGEM_NAO_ENCONTRADO = 'Reporte não encontrado.';
const MENSAGEM_NAO_ABERTO = 'Este reporte já não está em aberto e não pode mais ser editado.';
const MENSAGEM_FALHA_NA_FOTO = 'Não foi possível usar a foto. Tente de novo.';

export function TelaEditarReporte() {
  const { reportes, fotos } = useApis();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const idDoReporte = Number(id);
  const idValido = Number.isInteger(idDoReporte) && idDoReporte > 0;

  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(idValido);
  const [tentativa, setTentativa] = useState(0);

  const [descricao, setDescricao] = useState('');
  const [erroDescricao, setErroDescricao] = useState<Erro>(null);
  // Foto: a que ja esta no servidor (some se a pessoa remover) e a nova, escolhida agora.
  const [removida, setRemovida] = useState(false);
  const [novaFoto, setNovaFoto] = useState<ArquivoFoto | null>(null);
  const [novaFotoUrl, setNovaFotoUrl] = useState<string | null>(null);
  const [erroFoto, setErroFoto] = useState<string | null>(null);

  const [erroGeral, setErroGeral] = useState<string | null>(null);
  useAnunciar(erroGeral);
  const [salvando, setSalvando] = useState(false);
  const salvandoAgora = useRef(false);

  useEffect(() => {
    if (!idValido) return;
    let ativo = true;
    reportes
      .obter(idDoReporte)
      .then((encontrado) => {
        if (!ativo) return;
        setReporte(encontrado);
        setDescricao(encontrado.descricao);
        setErroAoCarregar(null);
      })
      .catch((falha) => {
        if (ativo) setErroAoCarregar(mensagemDeErroAoCarregar(falha));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [reportes, idDoReporte, idValido, tentativa]);

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function usarFoto(obter: () => Promise<ArquivoFoto | null>) {
    setErroFoto(null);
    try {
      const nova = await obter();
      if (nova) {
        setNovaFoto(nova);
        setNovaFotoUrl(null);
      }
    } catch (erro) {
      setErroFoto(ehErroAparelho(erro) ? erro.message : MENSAGEM_FALHA_NA_FOTO);
    }
  }

  function removerFoto() {
    setNovaFoto(null);
    setNovaFotoUrl(null);
    setRemovida(true);
    setErroFoto(null);
  }

  async function salvar() {
    if (salvandoAgora.current) return;
    const erro = validarDescricaoDoReporte(descricao);
    setErroDescricao(erro);
    setErroGeral(null);
    if (erro) return;

    salvandoAgora.current = true;
    setSalvando(true);
    try {
      const dados: DadosEdicaoReporte = { descricao: descricao.trim() };
      if (novaFoto) {
        let url = novaFotoUrl;
        if (!url) {
          try {
            url = (await fotos.enviar(novaFoto)).fotoUrl;
            setNovaFotoUrl(url);
          } catch (falha) {
            setErroFoto(mensagemDeErroDaFoto(falha));
            return;
          }
        }
        dados.fotoUrl = url;
      } else if (removida) {
        dados.fotoUrl = null;
      }
      await reportes.editar(idDoReporte, dados);
      voltar();
    } catch (falha) {
      if (ehErroApi(falha) && (falha.status === 400 || falha.status === 422)) {
        setErroDescricao(falha.campos.descricao ?? null);
      }
      setErroGeral(mensagemDeErroAoEditar(falha));
    } finally {
      salvandoAgora.current = false;
      setSalvando(false);
    }
  }

  const erro = idValido ? erroAoCarregar : MENSAGEM_NAO_ENCONTRADO;
  const naoEstaAberto = reporte !== null && reporte.status !== 'ABERTO';
  useAnunciar(erro);
  useAnunciar(naoEstaAberto ? MENSAGEM_NAO_ABERTO : null);
  const fotoNaTela: ArquivoFoto | null =
    novaFoto ??
    (!removida && reporte?.fotoUrl
      ? { uri: reporte.fotoUrl, nome: 'foto-atual', tipo: 'image/jpeg' }
      : null);

  return (
    <Tela>
      <Texto style={styles.titulo} accessibilityRole="header">
        Editar reporte
      </Texto>

      {carregando ? (
        <View style={styles.carregando}>
          <ActivityIndicator
            color={cores.acao}
            accessibilityLabel="Carregando reporte"
            accessibilityLanguage={IDIOMA_DO_APP}
          />
          <Texto style={styles.aviso}>Carregando reporte…</Texto>
        </View>
      ) : null}

      {erro ? (
        <>
          <View style={styles.faixaErro} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Texto style={styles.textoErro}>{erro}</Texto>
          </View>
          {idValido ? (
            <Botao
              titulo="Tentar de novo"
              variante="secundario"
              onPress={() => {
                setErroAoCarregar(null);
                setCarregando(true);
                setTentativa((n) => n + 1);
              }}
            />
          ) : null}
        </>
      ) : null}

      {naoEstaAberto ? (
        <View style={styles.faixaErro} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Texto style={styles.textoErro}>{MENSAGEM_NAO_ABERTO}</Texto>
        </View>
      ) : null}

      {reporte && !erro && !naoEstaAberto ? (
        <>
          <Protocolo valor={reporte.protocolo} style={styles.protocolo} />
          <View style={styles.caixa}>
            <Texto style={styles.categoria}>{reporte.categoria.nome}</Texto>
            <Texto style={styles.aviso}>{`Urgência: ${rotuloDaUrgencia(reporte.urgencia)}`}</Texto>
            <Texto style={styles.aviso}>
              {reporte.endereco ?? 'Endereço não informado, mas o ponto no mapa foi registrado.'}
            </Texto>
          </View>
          <Texto style={styles.aviso}>
            Só a descrição e a foto podem mudar. Para mudar o resto, cancele e faça um novo reporte.
          </Texto>

          <CampoTexto
            rotulo="Descrição"
            valor={descricao}
            aoMudar={(texto) => {
              setDescricao(texto);
              setErroDescricao(null);
            }}
            erro={erroDescricao}
            autoCapitalizar="sentences"
            multilinha
          />

          <CampoDeFoto
            foto={fotoNaTela}
            aoTirarFoto={() => void usarFoto(tirarFoto)}
            aoEscolherDaGaleria={() => void usarFoto(escolherFotoDaGaleria)}
            aoRemover={removerFoto}
            ocupado={salvando}
            erro={erroFoto}
          />

          {erroGeral ? (
            <View
              style={styles.faixaErro}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              <Texto style={styles.textoErro}>{erroGeral}</Texto>
            </View>
          ) : null}

          <Botao titulo="Salvar mudanças" onPress={() => void salvar()} carregando={salvando} />
        </>
      ) : null}

      <Botao titulo="Voltar" variante="secundario" onPress={voltar} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: fontes.titulo, fontFamily: fontes.familia.negrito, color: cores.texto },
  protocolo: { fontSize: fontes.subtitulo, fontFamily: fontes.familia.negrito, color: cores.acao },
  categoria: { fontSize: fontes.botao, fontFamily: fontes.familia.negrito, color: cores.texto },
  aviso: { fontSize: fontes.corpo, color: cores.textoSecundario },
  carregando: { flexDirection: 'row', alignItems: 'center', gap: espacos.pequeno },
  caixa: { padding: espacos.medio, gap: 4, borderRadius: 8, backgroundColor: cores.superficie },
  faixaErro: {
    padding: espacos.medio,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: cores.erro,
    backgroundColor: cores.fundoErro,
  },
  textoErro: { fontSize: fontes.corpo, color: cores.erro },
});
