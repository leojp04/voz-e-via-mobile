// Abre o discador do aparelho com o numero ja digitado (botao "Ligar" dos contatos). O app nao
// liga sozinho: a pessoa ainda toca em "ligar" no discador, entao nao ha chamada por engano.

import { Alert, Linking } from 'react-native';

/** Abre o discador; sem discador (ex.: tablet sem chip), avisa em vez de falhar calado. */
export function ligarPara(telefone: string): void {
  const digitos = telefone.replace(/\D/g, '');
  Linking.openURL(`tel:${digitos}`).catch(() => {
    Alert.alert('Não foi possível ligar', 'Seu aparelho não consegue fazer ligações.');
  });
}
