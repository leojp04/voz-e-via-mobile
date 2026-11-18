// Formulario de contato de emergencia: serve para "Novo contato" (/contatos/novo, sem id) e para
// "Editar contato" (/contatos/7, com id). Regras que protegem quem usa:
//  - Toda mensagem de erro diz se o contato foi ou NAO salvo (ou excluido).
//  - Excluir pergunta antes (dois passos): sem o contato, o assistente nao sabe quem chamar.
//  - O telefone ganha a mascara enquanto a pessoa digita; a API guarda so os digitos.
//  - Parentesco e opcional (como no Java): em branco vai como null.
// O servidor e quem decide de verdade: os erros por campo do 400 aparecem junto de cada campo.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { Botao } from '../components/Botao';
import { CampoTexto } from '../components/CampoTexto';
import { SeletorDeOpcao } from '../components/SeletorDeOpcao';
import { Tela } from '../components/Tela';
import { Texto } from '../components/Texto';
import { useApis } from '../contexts/ApisContext';
import { ehErroApi } from '../services/api/erro';
import type { DadosContato } from '../services/api/types';
import { cores, espacos, fontes, IDIOMA_DO_APP } from '../theme';
import { useAnunciar } from '../utils/anunciar';
import { formatarTelefone } from '../utils/formatar-telefone';
import {
  mensagemDeErroAoCarregarContatos,
  mensagemDeErroAoExcluirContato,
  mensagemDeErroAoSalvarContato,
} from '../utils/mensagem-de-erro';
import { validarContato } from '../utils/validar-contato';

const MENSAGEM_NAO_ENCONTRADO = 'Contato não encontrado.';
// O Java aceita prioridade de 1 a 10 (1 e quem chamar primeiro).
const PRIORIDADES = Array.from({ length: 10 }, (_, i) => ({ valor: i + 1, titulo: String(i + 1) }));

export function TelaFormularioContato() {
  const { contatos } = useApis();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editando = id !== undefined;
  const idDoContato = Number(id);
  const idValido = Number.isInteger(idDoContato) && idDoContato > 0;

  const [carregando, setCarregando] = useState(editando && idValido);
  const [erroAoCarregar, setErroAoCarregar] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  const [nome, setNome] = useState('');
  const [parentesco, setParentesco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [prioridade, setPrioridade] = useState(1);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  useAnunciar(erroGeral);
  const [ocupado, setOcupado] = useState(false);
  const ocupadoAgora = useRef(false);

  useEffect(() => {
    if (!editando || !idValido) return;
    let ativo = true;
    contatos
      .obter(idDoContato)
      .then((encontrado) => {
        if (!ativo) return;
        setNome(encontrado.nome);
        setParentesco(encontrado.parentesco ?? '');
        setTelefone(formatarTelefone(encontrado.telefone));
        setPrioridade(encontrado.prioridade);
        setErroAoCarregar(null);
      })
      .catch((falha) => {
        if (!ativo) return;
        setErroAoCarregar(mensagemDeErroAoCarregarContatos(falha));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [contatos, editando, idDoContato, idValido, tentativa]);

  function voltarParaLista() {
    if (router.canGoBack()) router.back();
    else router.replace('/contatos');
  }

  // Mexer num campo limpa o erro dele (a pessoa ja esta corrigindo).
  function limparErro(campo: string) {
    setErros((atuais) => {
      const { [campo]: _removido, ...resto } = atuais;
      return resto;
    });
  }

  async function salvar() {
    if (ocupadoAgora.current) return;
    const dados: DadosContato = {
      nome: nome.trim(),
      parentesco: parentesco.trim() === '' ? null : parentesco.trim(),
      telefone: telefone.replace(/\D/g, ''),
      prioridade,
    };
    const encontrados = validarContato(dados);
    setErros(encontrados);
    setErroGeral(null);
    if (Object.keys(encontrados).length > 0) return;

    ocupadoAgora.current = true;
    setOcupado(true);
    try {
      if (editando) await contatos.editar(idDoContato, dados);
      else await contatos.criar(dados);
      voltarParaLista();
    } catch (falha) {
      if (ehErroApi(falha) && falha.status === 400) setErros(falha.campos);
      setErroGeral(mensagemDeErroAoSalvarContato(falha));
    } finally {
      ocupadoAgora.current = false;
      setOcupado(false);
    }
  }

  async function excluir() {
    if (ocupadoAgora.current) return;
    ocupadoAgora.current = true;
    setOcupado(true);
    setErroGeral(null);
    try {
      await contatos.excluir(idDoContato);
      voltarParaLista();
    } catch (falha) {
      setErroGeral(mensagemDeErroAoExcluirContato(falha));
    } finally {
      ocupadoAgora.current = false;
      setOcupado(false);
    }
  }

  // Dois passos de proposito: excluir nao tem volta, entao o primeiro toque so pergunta.
  function pedirConfirmacao() {
    Alert.alert('Excluir o contato?', 'Essa ação não pode ser desfeita.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Excluir contato', style: 'destructive', onPress: () => void excluir() },
    ]);
  }

  const erro = editando && !idValido ? MENSAGEM_NAO_ENCONTRADO : erroAoCarregar;
  useAnunciar(erro);

  return (
    <Tela>
      <Texto style={styles.titulo} accessibilityRole="header">
        {editando ? 'Editar contato' : 'Novo contato'}
      </Texto>

      {carregando ? (
        <View style={styles.carregando}>
          <ActivityIndicator
            color={cores.acao}
            accessibilityLabel="Carregando contato"
            accessibilityLanguage={IDIOMA_DO_APP}
          />
          <Texto style={styles.aviso}>Carregando contato…</Texto>
        </View>
      ) : null}

      {erro ? (
        <>
          <View style={styles.faixaErro} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Texto style={styles.textoErro}>{erro}</Texto>
          </View>
          {idValido && erro !== MENSAGEM_NAO_ENCONTRADO ? (
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

      {!carregando && !erro ? (
        <>
          <CampoTexto
            rotulo="Nome"
            valor={nome}
            aoMudar={(texto) => {
              setNome(texto);
              limparErro('nome');
            }}
            erro={erros.nome}
            autoCompletar="name"
            autoCapitalizar="words"
          />
          <CampoTexto
            rotulo="Parentesco (opcional)"
            valor={parentesco}
            aoMudar={(texto) => {
              setParentesco(texto);
              limparErro('parentesco');
            }}
            erro={erros.parentesco}
            autoCapitalizar="none"
          />
          <CampoTexto
            rotulo="Telefone"
            valor={telefone}
            aoMudar={(texto) => {
              setTelefone(formatarTelefone(texto));
              limparErro('telefone');
            }}
            erro={erros.telefone}
            tipoTeclado="phone-pad"
            autoCompletar="tel"
          />
          <SeletorDeOpcao
            rotulo="Prioridade (1 é quem chamar primeiro)"
            opcoes={PRIORIDADES}
            valor={prioridade}
            aoMudar={(valor) => {
              setPrioridade(valor);
              limparErro('prioridade');
            }}
            erro={erros.prioridade}
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

          <Botao titulo="Salvar contato" onPress={() => void salvar()} carregando={ocupado} />
          {editando ? (
            <Botao
              titulo="Excluir contato"
              variante="perigo"
              onPress={pedirConfirmacao}
              desabilitado={ocupado}
            />
          ) : null}
        </>
      ) : null}

      <Botao titulo="Voltar" variante="secundario" onPress={voltarParaLista} />
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
