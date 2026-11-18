// Auditoria de acessibilidade para os testes das telas. Em vez de repetir as mesmas conferencias em
// cada arquivo de teste, percorre-se a arvore de elementos procurando o que o VoiceOver/TalkBack e a
// letra grande quebram: elemento tocavel sem papel ou sem nome, campo sem rotulo, imagem muda,
// alvo de toque menor que 48 dp e texto preso em uma linha so (corta quando a letra cresce).
// SO para testes (nao entra no app).

import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';

import { ALVO_MINIMO, IDIOMA_DO_APP } from '../theme';

// Percorre so os elementos "de verdade" (hosts: View, Text, TextInput, Image...).
function elementos(raiz: ReactTestInstance): ReactTestInstance[] {
  const achados: ReactTestInstance[] = [];
  const visitar = (no: ReactTestInstance) => {
    if (typeof no.type === 'string') achados.push(no);
    no.children.forEach((filho) => typeof filho !== 'string' && visitar(filho));
  };
  visitar(raiz);
  return achados;
}

function textoDe(no: ReactTestInstance): string {
  return no.children
    .map((filho) => (typeof filho === 'string' ? filho : textoDe(filho)))
    .join('')
    .trim();
}

function nome(no: ReactTestInstance): string {
  return String(no.props.accessibilityLabel ?? '').trim() || textoDe(no);
}

function descricao(no: ReactTestInstance): string {
  return `${String(no.type)} "${nome(no)}"`;
}

function tocavel(no: ReactTestInstance): boolean {
  return typeof no.props.onClick === 'function' || typeof no.props.onPress === 'function';
}

function escondido(no: ReactTestInstance): boolean {
  return (
    no.props['aria-hidden'] === true ||
    no.props.accessibilityElementsHidden === true ||
    no.props.importantForAccessibility === 'no-hide-descendants'
  );
}

function visiveis(raiz: ReactTestInstance) {
  return elementos(raiz).filter((no) => {
    for (let pai: ReactTestInstance | null = no; pai; pai = pai.parent) {
      if (typeof pai.type === 'string' && escondido(pai)) return false;
    }
    return true;
  });
}

/** Devolve a lista de problemas de acessibilidade da arvore (vazia = tudo certo). */
export function auditar(raiz: ReactTestInstance): string[] {
  const problemas: string[] = [];
  for (const no of visiveis(raiz)) {
    const tipo = String(no.type);
    const estilo = StyleSheet.flatten(no.props.style as StyleProp<ViewStyle>) ?? {};

    if (tocavel(no)) {
      if (!no.props.accessibilityRole && !no.props.role) {
        problemas.push(`${descricao(no)}: tocável sem accessibilityRole`);
      }
      if (!nome(no)) problemas.push(`${descricao(no)}: tocável sem nome para o leitor de tela`);
      const altura = Number(estilo.minHeight ?? estilo.height ?? 0);
      if (altura < ALVO_MINIMO) {
        problemas.push(
          `${descricao(no)}: alvo de toque com altura ${altura} dp (mínimo ${ALVO_MINIMO})`,
        );
      }
    }
    // O iOS lê com a voz do idioma do APARELHO, a menos que o elemento diga em que idioma está.
    // Sem isso, um iPhone em inglês lê o app em português com sotaque de quem não conhece a língua.
    const falado =
      tocavel(no) ||
      tipo === 'TextInput' ||
      tipo === 'Image' ||
      (tipo === 'Text' && textoDe(no) !== '') ||
      String(no.props.accessibilityLabel ?? '').trim() !== '';
    if (falado && no.props.accessibilityLanguage !== IDIOMA_DO_APP) {
      problemas.push(`${descricao(no)}: sem accessibilityLanguage="${IDIOMA_DO_APP}"`);
    }
    if (tipo === 'TextInput' && !no.props.accessibilityLabel) {
      problemas.push(`${descricao(no)}: campo de texto sem accessibilityLabel`);
    }
    if (tipo === 'Image' && no.props.accessible !== false && !no.props.accessibilityLabel) {
      problemas.push(`Image ${no.props.source?.uri ?? ''}: imagem sem accessibilityLabel`);
    }
    if (
      tipo === 'Text' &&
      no.props.numberOfLines === 1 &&
      !no.props.adjustsFontSizeToFit &&
      textoDe(no)
    ) {
      problemas.push(`${descricao(no)}: texto preso em 1 linha corta com letra grande`);
    }
  }
  return problemas;
}
