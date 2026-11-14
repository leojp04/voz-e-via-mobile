// Validacoes dos formularios. Cada funcao devolve null quando o valor e valido,
// ou a mensagem (em portugues) que sera mostrada ao usuario.
// Elas so ajudam a pessoa a corrigir cedo: quem decide de verdade e o servidor.

export type Erro = string | null;

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAMANHO_MINIMO_SENHA = 8;
const TAMANHO_MINIMO_NOME = 2;

export function validarEmail(valor: string): Erro {
  const email = valor.trim();
  if (email === '') return 'Informe o seu e-mail.';
  if (!FORMATO_EMAIL.test(email)) return 'Digite um e-mail válido, como nome@exemplo.com.';
  return null;
}

export function validarSenha(valor: string): Erro {
  // A senha nao passa por trim: espaco tambem e caractere de senha.
  if (valor === '') return 'Informe a sua senha.';
  if (valor.length < TAMANHO_MINIMO_SENHA) {
    return `A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`;
  }
  return null;
}

export function validarNome(valor: string): Erro {
  const nome = valor.trim();
  if (nome === '') return 'Informe o seu nome.';
  if (nome.length < TAMANHO_MINIMO_NOME) {
    return `O nome precisa ter pelo menos ${TAMANHO_MINIMO_NOME} letras.`;
  }
  return null;
}

export function validarTelefone(valor: string): Erro {
  if (valor.trim() === '') return 'Informe o seu telefone com DDD.';
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length !== 10 && digitos.length !== 11) {
    return 'Digite o telefone com DDD, por exemplo (11) 98765-4321.';
  }
  return null;
}

export function validarConsentimento(aceitou: boolean): Erro {
  if (!aceitou) return 'Para criar a conta, é preciso aceitar o uso dos seus dados.';
  return null;
}

// Mesmos limites da API .NET (a descricao tem de 10 a 500 letras); a API valida de novo.
const DESCRICAO_MINIMA = 10;
const DESCRICAO_MAXIMA = 500;

export function validarDescricaoDoReporte(valor: string): Erro {
  const descricao = valor.trim();
  if (descricao === '') return 'Descreva o problema.';
  if (descricao.length < DESCRICAO_MINIMA) {
    return `Descreva com pelo menos ${DESCRICAO_MINIMA} letras, para a prefeitura entender.`;
  }
  if (descricao.length > DESCRICAO_MAXIMA) {
    return `A descrição pode ter no máximo ${DESCRICAO_MAXIMA} caracteres.`;
  }
  return null;
}

export function validarCategoria(categoriaId: number | null): Erro {
  return categoriaId === null ? 'Escolha uma categoria.' : null;
}

export function validarLocalizacao(temLocalizacao: boolean): Erro {
  return temLocalizacao
    ? null
    : 'Toque em "Usar minha localização" para dizer onde está o problema.';
}
