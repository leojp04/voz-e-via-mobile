// API de fotos FALSA, em memoria (ver docs/adr/0004). Imita o POST /api/fotos do .NET: so aceita
// JPEG e PNG de quem esta logado. Em vez de guardar o arquivo em algum lugar, devolve o proprio
// endereco local da foto como "URL": assim a imagem aparece nas telas sem servidor de arquivos.

import { ErroApi } from '../erro';
import type { ArquivoFoto, FotosApi } from '../types';

interface Opcoes {
  /** Devolve o token da sessao atual (ou null). */
  obterToken: () => string | null;
  /** Descobre o usuario dono do token (vem da API de autenticacao falsa). */
  idDoToken: (token: string | null) => number | null;
  /** Atraso simulado em milissegundos, para ver os indicadores de carregamento. */
  latenciaMs?: number;
  /** Chamado quando ha token mas ele nao vale (sessao vencida), como o 401 da API real. */
  aoNaoAutorizado?: () => void;
}

const TIPOS_ACEITOS = new Set(['image/jpeg', 'image/png']);

export function criarFotosApiFalsa({
  obterToken,
  idDoToken,
  latenciaMs = 0,
  aoNaoAutorizado,
}: Opcoes): FotosApi {
  return {
    async enviar(arquivo: ArquivoFoto) {
      if (latenciaMs > 0) await new Promise((resolver) => setTimeout(resolver, latenciaMs));
      const token = obterToken();
      if (idDoToken(token) === null) {
        if (token) aoNaoAutorizado?.();
        throw new ErroApi(401, 'Sessão inválida. Entre novamente.');
      }
      if (!TIPOS_ACEITOS.has(arquivo.tipo)) {
        throw new ErroApi(400, 'Envie uma foto JPEG ou PNG.');
      }
      return { fotoUrl: arquivo.uri };
    },
  };
}
