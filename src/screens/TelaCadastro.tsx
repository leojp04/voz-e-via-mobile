// Tela de cadastro. Pede so o necessario (nome, e-mail, telefone, senha e o tipo de conta):
// nunca pergunta tipo de deficiencia, que e dado sensivel na LGPD (art. 5o, II).
// O consentimento comeca DESMARCADO e o link da Politica de Privacidade fica ao lado da caixa.
// Depois de criar a conta, o app ja entra com o mesmo e-mail e senha (menos um passo).

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Botao } from '../components/Botao';
import { CaixaConsentimento } from '../components/CaixaConsentimento';
import { CampoTexto } from '../components/CampoTexto';
import { Marca } from '../components/Marca';
import { Tela } from '../components/Tela';
import { Texto } from '../components/Texto';
import { useApis } from '../contexts/ApisContext';
import { useAuth } from '../contexts/AuthContext';
import { ehErroApi } from '../services/api/erro';
import type { DadosCadastro } from '../services/api/types';
import { ALVO_MINIMO, cores, espacos, fontes } from '../theme';
import { mensagemDeErro } from '../utils/mensagem-de-erro';
import {
  validarConsentimento,
  validarEmail,
  validarNome,
  validarSenha,
  validarTelefone,
  type Erro,
} from '../utils/validators';

type Papel = DadosCadastro['role'];

const PAPEIS: { valor: Papel; titulo: string }[] = [
  { valor: 'CIDADAO', titulo: 'Cidadão' },
  { valor: 'CUIDADOR', titulo: 'Cuidador' },
];

const TEXTO_CONSENTIMENTO = 'Li e aceito o uso dos meus dados, conforme a Política de Privacidade.';

interface ErrosDoFormulario {
  nome: Erro;
  email: Erro;
  telefone: Erro;
  senha: Erro;
  consentimento: Erro;
}

const SEM_ERROS: ErrosDoFormulario = {
  nome: null,
  email: null,
  telefone: null,
  senha: null,
  consentimento: null,
};

export function TelaCadastro() {
  const { auth } = useApis();
  const { login } = useAuth();
  const router = useRouter();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [papel, setPapel] = useState<Papel>('CIDADAO');
  const [consentimento, setConsentimento] = useState(false);
  const [erros, setErros] = useState<ErrosDoFormulario>(SEM_ERROS);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function criarConta() {
    const novosErros: ErrosDoFormulario = {
      nome: validarNome(nome),
      email: validarEmail(email),
      telefone: validarTelefone(telefone),
      senha: validarSenha(senha),
      consentimento: validarConsentimento(consentimento),
    };
    setErros(novosErros);
    setErroGeral(null);
    if (Object.values(novosErros).some(Boolean)) return;

    setEnviando(true);
    try {
      await auth.cadastrar({
        nome: nome.trim(),
        email: email.trim(),
        // So os digitos: "(11) 98765-4321" vira "11987654321".
        telefone: telefone.replace(/\D/g, ''),
        senha,
        role: papel,
        consentimento,
      });
      await login(email.trim(), senha);
    } catch (erro) {
      if (ehErroApi(erro) && erro.status === 409) {
        // E-mail repetido e um problema daquele campo, entao a mensagem aparece nele.
        setErros({ ...SEM_ERROS, email: mensagemDeErro(erro) });
      } else {
        setErroGeral(mensagemDeErro(erro));
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela>
      <Marca />
      <Texto style={styles.titulo} accessibilityRole="header">
        Criar conta
      </Texto>

      {erroGeral ? (
        <View style={styles.faixaErro} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Texto style={styles.textoErro}>{erroGeral}</Texto>
        </View>
      ) : null}

      <CampoTexto
        rotulo="Nome"
        valor={nome}
        aoMudar={setNome}
        erro={erros.nome}
        autoCompletar="name"
        autoCapitalizar="words"
      />
      <CampoTexto
        rotulo="E-mail"
        valor={email}
        aoMudar={setEmail}
        erro={erros.email}
        tipoTeclado="email-address"
        autoCompletar="email"
      />
      <CampoTexto
        rotulo="Telefone com DDD"
        valor={telefone}
        aoMudar={setTelefone}
        erro={erros.telefone}
        tipoTeclado="phone-pad"
        autoCompletar="tel"
      />
      <CampoTexto
        rotulo="Senha"
        valor={senha}
        aoMudar={setSenha}
        erro={erros.senha}
        senha
        autoCompletar="new-password"
      />

      <View style={styles.grupo} accessibilityRole="radiogroup" accessibilityLabel="Tipo de conta">
        <Texto style={styles.rotulo}>Tipo de conta</Texto>
        <View style={styles.papeis}>
          {PAPEIS.map((opcao) => {
            const selecionado = papel === opcao.valor;
            return (
              <Pressable
                key={opcao.valor}
                accessibilityRole="radio"
                accessibilityLabel={opcao.titulo}
                accessibilityState={{ selected: selecionado }}
                onPress={() => setPapel(opcao.valor)}
                style={[styles.papel, selecionado && styles.papelSelecionado]}
              >
                <Texto style={[styles.textoPapel, selecionado && styles.textoPapelSelecionado]}>
                  {opcao.titulo}
                </Texto>
              </Pressable>
            );
          })}
        </View>
      </View>

      <CaixaConsentimento
        texto={TEXTO_CONSENTIMENTO}
        marcada={consentimento}
        aoAlternar={() => {
          setConsentimento((atual) => !atual);
          // O aviso era sobre a caixa desmarcada; ao mexer nela ele fica velho, entao some.
          setErros((atuais) => ({ ...atuais, consentimento: null }));
        }}
        erro={erros.consentimento}
      />
      <Botao
        titulo="Ler a Política de Privacidade"
        variante="secundario"
        onPress={() => router.push('/privacidade')}
      />

      <Botao titulo="Criar conta" onPress={() => void criarConta()} carregando={enviando} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: fontes.titulo, fontFamily: fontes.familia.negrito, color: cores.texto },
  faixaErro: {
    padding: espacos.medio,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: cores.erro,
    backgroundColor: cores.fundoErro,
  },
  textoErro: { fontSize: fontes.corpo, color: cores.erro },
  grupo: { gap: espacos.pequeno },
  rotulo: { fontSize: fontes.rotulo, fontFamily: fontes.familia.negrito, color: cores.texto },
  papeis: { flexDirection: 'row', gap: espacos.medio },
  papel: {
    flex: 1,
    minHeight: ALVO_MINIMO,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: cores.acao,
    backgroundColor: cores.fundo,
  },
  papelSelecionado: { backgroundColor: cores.acao },
  textoPapel: { fontSize: fontes.botao, fontFamily: fontes.familia.negrito, color: cores.acao },
  textoPapelSelecionado: { color: cores.textoSobreAcao },
});
