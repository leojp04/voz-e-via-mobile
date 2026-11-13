// Icone decorativo do app (Ionicons, do pacote @expo/vector-icons; ver ADR 0007). Fica escondido
// do leitor de tela de proposito: todo botao com icone ja tem um rotulo falado, e ler "icone de
// microfone" antes do rotulo so atrapalharia.

import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { cores } from '../theme';

export type NomeDeIcone = ComponentProps<typeof Ionicons>['name'];

interface PropsIcone {
  nome: NomeDeIcone;
  tamanho?: number;
  cor?: string;
}

export function Icone({ nome, tamanho = 24, cor = cores.texto }: PropsIcone) {
  return (
    <Ionicons
      name={nome}
      size={tamanho}
      color={cor}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
