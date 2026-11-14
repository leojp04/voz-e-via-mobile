// Validacao do formulario de contato de emergencia. Devolve as mensagens (em portugues) por
// campo; objeto vazio = tudo certo. Ajuda a pessoa a corrigir cedo; quem decide de verdade e a
// API (mesmas regras da API falsa e do plano unico, secao 8.1).

import type { DadosContato } from '../services/api/types';

export function validarContato(dados: DadosContato): Record<string, string> {
  const campos: Record<string, string> = {};
  const nome = dados.nome.trim();
  const apelido = dados.apelido.trim();
  const digitos = dados.telefone.replace(/\D/g, '');

  if (nome.length < 2 || nome.length > 80) campos.nome = 'O nome deve ter de 2 a 80 letras.';
  if (apelido.length < 1 || apelido.length > 30) {
    campos.apelido = 'O apelido deve ter de 1 a 30 letras (ex.: filha).';
  }
  if (digitos.length < 10 || digitos.length > 11) {
    campos.telefone = 'Digite o telefone com DDD (10 ou 11 números).';
  }
  if (!Number.isInteger(dados.prioridade) || dados.prioridade < 1 || dados.prioridade > 5) {
    campos.prioridade = 'A prioridade vai de 1 a 5.';
  }
  return campos;
}
