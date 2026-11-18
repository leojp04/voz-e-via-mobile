// Tela do perfil de emergencia: serve para CRIAR (a pessoa ainda nao tem perfil) e para EDITAR.
// Regras que protegem quem usa:
//  - Tudo e opcional. A mobilidade ja vem em "Prefiro nao informar" e a tela explica que so vai
//    na mensagem de socorro enviada aos contatos (dado de saude, LGPD).
//  - Toda mensagem de erro diz se o perfil foi ou NAO foi salvo.
//  - Nada do que a pessoa digita vai para log nem para mensagem de erro.

import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Botao } from '../components/Botao';
import { CampoTexto } from '../components/CampoTexto';
import { SeletorDeOpcao } from '../components/SeletorDeOpcao';
import { Tela } from '../components/Tela';
import { Texto } from '../components/Texto';
import { useApis } from '../contexts/ApisContext';
import { ehErroApi } from '../services/api/erro';
import type { DadosPerfil, Mobilidade, PerfilEmergencia } from '../services/api/types';
import { cores, espacos, fontes, IDIOMA_DO_APP } from '../theme';
import { mensagemDeErroAoCarregar, mensagemDeErroAoSalvarPerfil } from '../utils/mensagem-de-erro';
import { validarPerfil } from '../utils/validar-perfil';

const MOBILIDADES: { valor: Mobilidade; titulo: string }[] = [
  { valor: 'NAO_INFORMADO', titulo: 'Prefiro não informar' },
  { valor: 'NENHUMA', titulo: 'Nenhuma' },
  { valor: 'CADEIRANTE', titulo: 'Cadeirante' },
  { valor: 'ANDADOR', titulo: 'Uso andador' },
  { valor: 'BENGALA', titulo: 'Uso bengala' },
  { valor: 'DEFICIENCIA_VISUAL', titulo: 'Deficiência visual' },
  { valor: 'DEFICIENCIA_AUDITIVA', titulo: 'Deficiência auditiva' },
];

// Texto em branco vira null (o Java trata como "nao informado").
function textoOuNull(texto: string): string | null {
  const limpo = texto.trim();
  return limpo === '' ? null : limpo;
}

export function TelaPerfil() {
  const { perfis } = useApis();
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [erroAoCarregar, setErroAoCarregar] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  // null = a pessoa ainda nao tem perfil (vai criar).
  const [perfil, setPerfil] = useState<PerfilEmergencia | null>(null);

  const [mobilidade, setMobilidade] = useState<Mobilidade>('NAO_INFORMADO');
  const [condicoesSaude, setCondicoesSaude] = useState('');
  const [medicamentos, setMedicamentos] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const ocupadoAgora = useRef(false);

  useEffect(() => {
    let ativo = true;
    perfis
      .meu()
      .then((encontrado) => {
        if (!ativo) return;
        setPerfil(encontrado);
        if (encontrado) {
          setMobilidade(encontrado.mobilidade);
          setCondicoesSaude(encontrado.condicoesSaude ?? '');
          setMedicamentos(encontrado.medicamentos ?? '');
          setObservacoes(encontrado.observacoes ?? '');
        }
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
  }, [perfis, tentativa]);

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/contatos');
  }

  function limparErro(campo: string) {
    setErros((atuais) => {
      const { [campo]: _removido, ...resto } = atuais;
      return resto;
    });
  }

  async function salvar() {
    if (ocupadoAgora.current) return;
    const dados: DadosPerfil = {
      mobilidade,
      condicoesSaude: textoOuNull(condicoesSaude),
      medicamentos: textoOuNull(medicamentos),
      observacoes: textoOuNull(observacoes),
    };
    const encontrados = validarPerfil(dados);
    setErros(encontrados);
    setErroGeral(null);
    if (Object.keys(encontrados).length > 0) return;

    ocupadoAgora.current = true;
    setOcupado(true);
    try {
      if (perfil) await perfis.atualizar(perfil.id, dados);
      else await perfis.criar(dados);
      voltar();
    } catch (falha) {
      if (ehErroApi(falha) && falha.status === 400) setErros(falha.campos);
      setErroGeral(mensagemDeErroAoSalvarPerfil(falha));
    } finally {
      ocupadoAgora.current = false;
      setOcupado(false);
    }
  }

  const criando = perfil === null;

  return (
    <Tela>
      <Texto style={styles.titulo} accessibilityRole="header">
        {criando ? 'Criar meu perfil de emergência' : 'Meu perfil de emergência'}
      </Texto>

      {carregando ? (
        <View style={styles.carregando}>
          <ActivityIndicator
            color={cores.acao}
            accessibilityLabel="Carregando perfil"
            accessibilityLanguage={IDIOMA_DO_APP}
          />
          <Texto style={styles.aviso}>Carregando perfil…</Texto>
        </View>
      ) : null}

      {erroAoCarregar ? (
        <>
          <View style={styles.faixaErro} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Texto style={styles.textoErro}>{erroAoCarregar}</Texto>
          </View>
          <Botao
            titulo="Tentar de novo"
            variante="secundario"
            onPress={() => {
              setErroAoCarregar(null);
              setCarregando(true);
              setTentativa((n) => n + 1);
            }}
          />
        </>
      ) : null}

      {!carregando && !erroAoCarregar ? (
        <>
          <Texto style={styles.aviso}>
            Tudo aqui é opcional. Estas informações são dados de saúde e só vão na mensagem de
            socorro enviada aos seus contatos.
          </Texto>
          <SeletorDeOpcao
            rotulo="Mobilidade (opcional)"
            opcoes={MOBILIDADES}
            valor={mobilidade}
            aoMudar={setMobilidade}
          />
          <CampoTexto
            rotulo="Condições de saúde (opcional)"
            valor={condicoesSaude}
            aoMudar={(texto) => {
              setCondicoesSaude(texto);
              limparErro('condicoesSaude');
            }}
            erro={erros.condicoesSaude}
            multilinha
            autoCapitalizar="sentences"
          />
          <CampoTexto
            rotulo="Medicamentos (opcional)"
            valor={medicamentos}
            aoMudar={(texto) => {
              setMedicamentos(texto);
              limparErro('medicamentos');
            }}
            erro={erros.medicamentos}
            multilinha
            autoCapitalizar="sentences"
          />
          <CampoTexto
            rotulo="Observações (opcional)"
            valor={observacoes}
            aoMudar={(texto) => {
              setObservacoes(texto);
              limparErro('observacoes');
            }}
            erro={erros.observacoes}
            multilinha
            autoCapitalizar="sentences"
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

          <Botao
            titulo={criando ? 'Criar perfil' : 'Salvar perfil'}
            onPress={() => void salvar()}
            carregando={ocupado}
          />
        </>
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
