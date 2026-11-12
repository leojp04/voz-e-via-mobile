// Guarda a sessao (token + usuario) no SecureStore, o cofre do aparelho: Keychain no iOS e
// Keystore no Android (ver docs/adr/0003). O token e um segredo, entao nunca vai para o
// AsyncStorage nem para o codigo.

import * as SecureStore from 'expo-secure-store';

import type { Sessao } from './api/types';

const CHAVE_SESSAO = 'voz-e-via.sessao';

/** Contrato do armazenamento; nos testes do AuthContext ele e trocado por uma versao em memoria. */
export interface ArmazenamentoSessao {
  ler(): Promise<Sessao | null>;
  salvar(sessao: Sessao): Promise<void>;
  apagar(): Promise<void>;
}

// O que esta guardado pode estar corrompido ou ser de uma versao antiga do app; so aceitamos
// o que tem a forma exata de uma Sessao.
function ehSessao(valor: unknown): valor is Sessao {
  if (!valor || typeof valor !== 'object') return false;
  const s = valor as Partial<Sessao>;
  const u = s.usuario as Partial<Sessao['usuario']> | undefined;
  return (
    typeof s.token === 'string' &&
    typeof s.expiraEm === 'string' &&
    !!u &&
    typeof u.id === 'number' &&
    typeof u.nome === 'string' &&
    typeof u.role === 'string'
  );
}

export function criarArmazenamentoSecureStore(): ArmazenamentoSessao {
  return {
    async ler() {
      const texto = await SecureStore.getItemAsync(CHAVE_SESSAO);
      if (!texto) return null;
      try {
        const dados: unknown = JSON.parse(texto);
        return ehSessao(dados) ? dados : null;
      } catch {
        return null;
      }
    },

    async salvar(sessao) {
      await SecureStore.setItemAsync(CHAVE_SESSAO, JSON.stringify(sessao));
    },

    async apagar() {
      await SecureStore.deleteItemAsync(CHAVE_SESSAO);
    },
  };
}
