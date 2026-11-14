// Tela de detalhe de um reporte: protocolo, status, categoria, urgencia, descricao, foto, local
// (com "Ver no mapa") e o historico de mudancas de status. O id vem da rota (/reportes/7).
// Recarrega quando a tela volta ao foco, para mostrar o que mudou (ex.: depois de editar).
// Se o reporte nao existe ou e de outra pessoa, a API responde 404 e a tela so avisa, sem
// revelar qual dos dois casos e.
// Com o reporte ABERTO, a pessoa pode editar (descricao e foto) ou cancelar. Cancelar pede
// confirmacao, porque nao tem volta. O servidor e quem decide de verdade (409 se o status mudou);
// aqui os botoes so somem para quem nao pode usa-los.

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, View } from 'react-native';

import { Botao } from '../components/Botao';
import { EtiquetaDeStatus } from '../components/EtiquetaDeStatus';
import { Tela } from '../components/Tela';
import { Texto } from '../components/Texto';
import { useApis } from '../contexts/ApisContext';
import type { Reporte } from '../services/api/types';
import { cores, espacos, fontes } from '../theme';
import { formatarData } from '../utils/formatar-data';
import { mensagemDeErroAoCancelar, mensagemDeErroAoCarregar } from '../utils/mensagem-de-erro';
import { estiloDoStatus, rotuloDaUrgencia } from '../utils/status-do-reporte';
import { abrirNoMapa } from '../utils/url-do-mapa';

const MENSAGEM_NAO_ENCONTRADO = 'Reporte não encontrado.';

export function TelaDetalheReporte() {
  const { reportes } = useApis();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const idDoReporte = Number(id);
  const idValido = Number.isInteger(idDoReporte) && idDoReporte > 0;

  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [cancelando, setCancelando] = useState(false);

  // Busca o reporte. Usada ao entrar na tela, ao voltar a ela e no "Tentar de novo".
  const carregar = useCallback(async () => {
    if (!idValido) return;
    try {
      setReporte(await reportes.obter(idDoReporte));
      setErroAoCarregar(null);
    } catch (falha) {
      setErroAoCarregar(mensagemDeErroAoCarregar(falha));
    } finally {
      setCarregando(false);
    }
  }, [reportes, idDoReporte, idValido]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  async function cancelarReporte() {
    setCancelando(true);
    try {
      await reportes.cancelar(idDoReporte);
    } catch (falha) {
      Alert.alert('Não foi possível cancelar', mensagemDeErroAoCancelar(falha));
    } finally {
      setCancelando(false);
    }
    // Recarrega nos dois casos: no sucesso mostra "Cancelado"; no 409 mostra o status de verdade.
    await carregar();
  }

  // Dois passos de proposito: cancelar nao tem volta, entao o primeiro toque so pergunta.
  function pedirConfirmacao() {
    Alert.alert(
      'Cancelar o reporte?',
      'O reporte deixa de ser analisado pela prefeitura. Essa ação não pode ser desfeita.',
      [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Cancelar reporte', style: 'destructive', onPress: () => void cancelarReporte() },
      ],
    );
  }

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  const erro = idValido ? erroAoCarregar : MENSAGEM_NAO_ENCONTRADO;

  return (
    <Tela>
      <Texto style={styles.titulo} accessibilityRole="header">
        Detalhe do reporte
      </Texto>

      {idValido && carregando ? (
        <View style={styles.carregando}>
          <ActivityIndicator color={cores.acao} accessibilityLabel="Carregando reporte" />
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
                void carregar();
              }}
            />
          ) : null}
        </>
      ) : null}

      {reporte && !erro ? (
        <>
          <Texto style={styles.protocolo}>{reporte.protocolo}</Texto>
          <EtiquetaDeStatus status={reporte.status} />
          <Texto style={styles.categoria}>{reporte.categoria.nome}</Texto>
          <Texto style={styles.aviso}>{`Urgência: ${rotuloDaUrgencia(reporte.urgencia)}`}</Texto>
          <Texto style={styles.corpo}>{reporte.descricao}</Texto>

          {reporte.fotoUrl ? (
            <Image
              source={{ uri: reporte.fotoUrl }}
              accessibilityRole="image"
              accessibilityLabel="Foto do problema"
              style={styles.imagem}
              resizeMode="cover"
            />
          ) : null}

          <Texto style={styles.secao} accessibilityRole="header">
            Localização
          </Texto>
          <View style={styles.caixa}>
            <Texto style={styles.corpo}>
              {reporte.endereco ?? 'Endereço não informado, mas o ponto no mapa foi registrado.'}
            </Texto>
            <Texto style={styles.aviso}>
              {`${reporte.latitude.toFixed(5)}, ${reporte.longitude.toFixed(5)}`}
            </Texto>
          </View>
          <Botao
            titulo="Ver no mapa"
            variante="secundario"
            icone="map-outline"
            onPress={() => abrirNoMapa(reporte.latitude, reporte.longitude)}
          />

          <Texto style={styles.secao} accessibilityRole="header">
            Histórico
          </Texto>
          {reporte.historico.map((item, posicao) => (
            <View key={`${item.statusNovo}-${item.criadoEm}-${posicao}`} style={styles.item}>
              <Texto style={styles.itemTitulo}>
                {`${estiloDoStatus(item.statusNovo).rotulo} · ${formatarData(item.criadoEm)}`}
              </Texto>
              {item.observacao ? <Texto style={styles.corpo}>{item.observacao}</Texto> : null}
            </View>
          ))}

          <Texto style={styles.aviso}>{`Enviado em ${formatarData(reporte.criadoEm)}`}</Texto>
          {reporte.atualizadoEm !== reporte.criadoEm ? (
            <Texto style={styles.aviso}>
              {`Atualizado em ${formatarData(reporte.atualizadoEm)}`}
            </Texto>
          ) : null}

          {reporte.status === 'ABERTO' ? (
            <>
              <Botao
                titulo="Editar reporte"
                icone="create-outline"
                onPress={() => router.push(`/reportes/${reporte.id}/editar`)}
                desabilitado={cancelando}
              />
              <Botao
                titulo="Cancelar reporte"
                variante="perigo"
                onPress={pedirConfirmacao}
                carregando={cancelando}
              />
            </>
          ) : null}
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
  secao: { fontSize: fontes.subtitulo, fontFamily: fontes.familia.negrito, color: cores.texto },
  corpo: { fontSize: fontes.corpo, color: cores.texto },
  aviso: { fontSize: fontes.corpo, color: cores.textoSecundario },
  carregando: { flexDirection: 'row', alignItems: 'center', gap: espacos.pequeno },
  imagem: { width: '100%', height: 220, borderRadius: 8, backgroundColor: cores.superficie },
  caixa: { padding: espacos.medio, gap: 4, borderRadius: 8, backgroundColor: cores.superficie },
  item: { gap: 2, paddingLeft: espacos.medio, borderLeftWidth: 4, borderLeftColor: cores.acao },
  itemTitulo: { fontSize: fontes.corpo, fontFamily: fontes.familia.negrito, color: cores.texto },
  faixaErro: {
    padding: espacos.medio,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: cores.erro,
    backgroundColor: cores.fundoErro,
  },
  textoErro: { fontSize: fontes.corpo, color: cores.erro },
});
