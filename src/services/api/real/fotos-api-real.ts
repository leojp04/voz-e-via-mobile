// API de fotos REAL: envia a foto do reporte para a API .NET (POST /api/fotos, multipart) e
// recebe a URL guardada. O reporte so leva essa URL (docs/adr/0008).
// A API devolve so o caminho ("/uploads/..."); aqui ele vira URL completa para a tela mostrar.

import type { ClienteHttp } from '../cliente-http';
import type { FotosApi } from '../types';
import { paraUrlCompleta } from './url-da-foto';

export function criarFotosApiReal(cliente: ClienteHttp, urlBase: string): FotosApi {
  return {
    enviar: async (arquivo) => {
      const { fotoUrl } = await cliente.enviarArquivo<{ fotoUrl: string }>('/api/fotos', arquivo);
      return { fotoUrl: paraUrlCompleta(urlBase, fotoUrl) };
    },
  };
}
