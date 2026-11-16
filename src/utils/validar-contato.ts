// Validacao do formulario de contato de emergencia. Devolve as mensagens (em portugues) por
// campo; objeto vazio = tudo certo. Ajuda a pessoa a corrigir cedo; quem decide de verdade e a
// API (ContatoEmergenciaRequest do Java: nome ate 120, telefone BR com DDD, parentesco opcional
// ate 60 e prioridade de 1 a 10).

import type { DadosContato } from '../services/api/types';

export function validarContato(dados: DadosContato): Record<string, string> {
  const campos: Record<string, string> = {};
  const nome = dados.nome.trim();
  const parentesco = (dados.parentesco ?? '').trim();
  const digitos = dados.telefone.replace(/\D/g, '');

  if (nome.length < 2 || nome.length > 120) campos.nome = 'O nome deve ter de 2 a 120 letras.';
  if (parentesco.length > 60) campos.parentesco = 'O parentesco deve ter até 60 letras.';
  if (digitos.length < 10 || digitos.length > 11) {
    campos.telefone = 'Digite o telefone com DDD (10 ou 11 números).';
  }
  if (!Number.isInteger(dados.prioridade) || dados.prioridade < 1 || dados.prioridade > 10) {
    campos.prioridade = 'A prioridade vai de 1 a 10.';
  }
  return campos;
}
