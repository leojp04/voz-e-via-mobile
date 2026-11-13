// Tela de login. Valida no app so para ajudar a pessoa a corrigir cedo; quem decide se a
// credencial vale e o servidor. Ao entrar, o NavegadorRaiz troca sozinho para o grupo (app).

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao } from '../components/Botao';
import { CampoTexto } from '../components/CampoTexto';
import { Marca } from '../components/Marca';
import { Tela } from '../components/Tela';
import { Texto } from '../components/Texto';
import { useAuth } from '../contexts/AuthContext';
import { cores, espacos, fontes } from '../theme';
import { mensagemDeErro } from '../utils/mensagem-de-erro';
import { validarEmail, validarSenha, type Erro } from '../utils/validators';

export function TelaLogin() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erroEmail, setErroEmail] = useState<Erro>(null);
  const [erroSenha, setErroSenha] = useState<Erro>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    const novoErroEmail = validarEmail(email);
    const novoErroSenha = validarSenha(senha);
    setErroEmail(novoErroEmail);
    setErroSenha(novoErroSenha);
    setErroGeral(null);
    if (novoErroEmail || novoErroSenha) return;

    setEnviando(true);
    try {
      await login(email.trim(), senha);
    } catch (erro) {
      setErroGeral(mensagemDeErro(erro));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela>
      <Marca />
      <Texto style={styles.titulo} accessibilityRole="header">
        Entrar
      </Texto>
      <Texto style={styles.subtitulo}>Bem-vindo ao Voz & Via.</Texto>

      {erroGeral ? (
        <View style={styles.faixaErro} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Texto style={styles.textoErro}>{erroGeral}</Texto>
        </View>
      ) : null}

      <CampoTexto
        rotulo="E-mail"
        valor={email}
        aoMudar={setEmail}
        erro={erroEmail}
        tipoTeclado="email-address"
        autoCompletar="email"
      />
      <CampoTexto
        rotulo="Senha"
        valor={senha}
        aoMudar={setSenha}
        erro={erroSenha}
        senha
        autoCompletar="current-password"
      />

      <Botao titulo="Entrar" onPress={() => void entrar()} carregando={enviando} />
      <Botao
        titulo="Criar conta"
        variante="secundario"
        onPress={() => router.push('/cadastro')}
        desabilitado={enviando}
      />
    </Tela>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: fontes.titulo, fontFamily: fontes.familia.negrito, color: cores.texto },
  subtitulo: { fontSize: fontes.subtitulo, color: cores.textoSecundario },
  faixaErro: {
    padding: espacos.medio,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: cores.erro,
    backgroundColor: cores.fundoErro,
  },
  textoErro: { fontSize: fontes.corpo, color: cores.erro },
});
