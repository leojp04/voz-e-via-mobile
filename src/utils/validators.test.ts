import {
  validarConsentimento,
  validarEmail,
  validarNome,
  validarSenha,
  validarTelefone,
} from './validators';

// Cada validador devolve null quando o valor e valido, ou a mensagem de erro para o usuario.

describe('validarEmail', () => {
  it('aceita um e-mail valido', () => {
    expect(validarEmail('maria@exemplo.com')).toBeNull();
  });

  it('ignora espacos nas pontas', () => {
    expect(validarEmail('  maria@exemplo.com  ')).toBeNull();
  });

  it.each(['', '   ', 'maria', 'maria@', '@exemplo.com', 'maria@exemplo', 'maria exemplo@a.com'])(
    'recusa "%s"',
    (valor) => {
      expect(validarEmail(valor)).not.toBeNull();
    },
  );

  it('pede o e-mail quando esta vazio', () => {
    expect(validarEmail('')).toBe('Informe o seu e-mail.');
  });

  it('avisa quando o formato e invalido', () => {
    expect(validarEmail('maria@')).toBe('Digite um e-mail válido, como nome@exemplo.com.');
  });
});

describe('validarSenha', () => {
  it('aceita senha com 8 caracteres', () => {
    expect(validarSenha('abcd1234')).toBeNull();
  });

  it('recusa senha com menos de 8 caracteres', () => {
    expect(validarSenha('abc1234')).toBe('A senha precisa ter pelo menos 8 caracteres.');
  });

  it('pede a senha quando esta vazia', () => {
    expect(validarSenha('')).toBe('Informe a sua senha.');
  });

  it('nao apaga espacos da senha (eles contam como caractere)', () => {
    expect(validarSenha('a b c d e')).toBeNull();
  });
});

describe('validarNome', () => {
  it('aceita um nome com pelo menos 2 letras', () => {
    expect(validarNome('Ana')).toBeNull();
  });

  it('ignora espacos nas pontas', () => {
    expect(validarNome('  Jo  ')).toBeNull();
  });

  it('recusa nome vazio', () => {
    expect(validarNome('   ')).toBe('Informe o seu nome.');
  });

  it('recusa nome com uma letra so', () => {
    expect(validarNome('A')).toBe('O nome precisa ter pelo menos 2 letras.');
  });
});

describe('validarTelefone', () => {
  it.each(['11987654321', '(11) 98765-4321', '1133334444', '(11) 3333-4444'])(
    'aceita "%s"',
    (valor) => {
      expect(validarTelefone(valor)).toBeNull();
    },
  );

  it.each(['', '123', '119876543210', 'abcdefghijk'])('recusa "%s"', (valor) => {
    expect(validarTelefone(valor)).not.toBeNull();
  });

  it('pede o telefone quando esta vazio', () => {
    expect(validarTelefone('')).toBe('Informe o seu telefone com DDD.');
  });

  it('avisa quando o numero nao tem 10 ou 11 digitos', () => {
    expect(validarTelefone('123')).toBe('Digite o telefone com DDD, por exemplo (11) 98765-4321.');
  });
});

describe('validarConsentimento', () => {
  it('aceita quando a pessoa marcou a caixa', () => {
    expect(validarConsentimento(true)).toBeNull();
  });

  it('recusa quando a caixa nao foi marcada', () => {
    expect(validarConsentimento(false)).toBe(
      'Para criar a conta, é preciso aceitar o uso dos seus dados.',
    );
  });
});
