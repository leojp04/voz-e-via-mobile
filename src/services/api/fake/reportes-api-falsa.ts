// API de reportes FALSA, em memoria (ver docs/adr/0004). Imita as regras da API .NET (plano unico,
// secao 8.2) para o app poder ser desenvolvido e testado antes de o backend existir:
// dono do reporte, 404 para reporte de outra pessoa, 409 fora do status ABERTO, idempotencia
// pelo Idempotency-Key e limite de 5 criacoes por minuto (429). Os dados somem quando o app fecha.

import { ErroApi } from '../erro';
import type {
  Categoria,
  DadosEdicaoReporte,
  DadosNovoReporte,
  Pagina,
  Reporte,
  ReporteResumo,
  ReportesApi,
  Urgencia,
} from '../types';

export const CATEGORIAS_FALSAS: Categoria[] = [
  { id: 1, codigo: 'CALCADA', nome: 'Calçada quebrada' },
  { id: 2, codigo: 'RAMPA', nome: 'Rampa de acessibilidade' },
  { id: 3, codigo: 'BURACO', nome: 'Buraco na rua' },
  { id: 4, codigo: 'ILUMINACAO', nome: 'Iluminação' },
  { id: 5, codigo: 'SEMAFORO_SONORO', nome: 'Semáforo sonoro' },
  { id: 6, codigo: 'PISO_TATIL', nome: 'Piso tátil' },
  { id: 7, codigo: 'LIXO', nome: 'Lixo ou entulho' },
  { id: 8, codigo: 'OUTRO', nome: 'Outro problema' },
];

const URGENCIAS: Urgencia[] = ['BAIXA', 'MEDIA', 'ALTA'];
const DESCRICAO_MINIMA = 10;
const DESCRICAO_MAXIMA = 500;
const TAMANHO_MAXIMO_DA_PAGINA = 50;
// Limite do plano unico (8.2): 5 criacoes de reporte por minuto, por usuario.
const CRIACOES_POR_JANELA = 5;
const JANELA_MS = 60_000;

interface Opcoes {
  /** Devolve o token da sessao atual (ou null). */
  obterToken: () => string | null;
  /** Descobre o usuario dono do token (vem da API de autenticacao falsa). */
  idDoToken: (token: string | null) => number | null;
  /** Atraso simulado em milissegundos, para ver os indicadores de carregamento. */
  latenciaMs?: number;
  /** Relogio (em milissegundos); os testes trocam para andar no tempo. */
  agora?: () => number;
  /** Chamado quando ha token mas ele nao vale (sessao vencida), como o 401 da API real. */
  aoNaoAutorizado?: () => void;
}

interface ReporteArmazenado extends Reporte {
  usuarioId: number;
}

interface RespostaIdempotente {
  /** Corpo normalizado, para comparar com uma repeticao da mesma chave. */
  corpo: string;
  resposta: Reporte;
}

// Copia profunda simples (os reportes so tem texto, numeros e listas). Evita que quem recebe um
// reporte mexa, sem querer, no que esta guardado na "base".
function copiar<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

function semDono({ usuarioId: _usuarioId, ...reporte }: ReporteArmazenado): Reporte {
  return copiar(reporte);
}

function erroDeCampos(campos: Record<string, string>): ErroApi {
  return new ErroApi(400, 'Dados inválidos.', campos);
}

function validarDescricao(descricao: string, campos: Record<string, string>) {
  const tamanho = descricao.trim().length;
  if (tamanho < DESCRICAO_MINIMA) {
    campos.descricao = `Descreva o problema com pelo menos ${DESCRICAO_MINIMA} letras.`;
  } else if (tamanho > DESCRICAO_MAXIMA) {
    campos.descricao = `A descrição pode ter no máximo ${DESCRICAO_MAXIMA} caracteres.`;
  }
}

export function criarReportesApiFalsa({
  obterToken,
  idDoToken,
  latenciaMs = 0,
  agora = Date.now,
  aoNaoAutorizado,
}: Opcoes): ReportesApi {
  const reportes = new Map<number, ReporteArmazenado>();
  const respostasIdempotentes = new Map<string, RespostaIdempotente>();
  const criacoesPorUsuario = new Map<number, number[]>();
  let proximoId = 1;

  const esperar = () => (latenciaMs > 0 ? new Promise((r) => setTimeout(r, latenciaMs)) : null);
  const agoraIso = () => new Date(agora()).toISOString();

  // Toda chamada exige sessao valida; quem chama recebe o id do usuario logado.
  const usuarioAtual = (): number => {
    const token = obterToken();
    const id = idDoToken(token);
    if (id === null) {
      // Como na API real: so e "sessao vencida" quando havia token (sem token e so "nao logado").
      if (token) aoNaoAutorizado?.();
      throw new ErroApi(401, 'Sessão inválida. Entre novamente.');
    }
    return id;
  };

  // Reporte que existe E e do usuario; senao 404 (nao revela que existe, como a API .NET).
  const reporteDoUsuario = (id: number, usuarioId: number): ReporteArmazenado => {
    const reporte = reportes.get(id);
    if (!reporte || reporte.usuarioId !== usuarioId) {
      throw new ErroApi(404, 'Reporte não encontrado.');
    }
    return reporte;
  };

  return {
    async listarCategorias() {
      await esperar();
      usuarioAtual();
      return copiar(CATEGORIAS_FALSAS);
    },

    async criar(dados: DadosNovoReporte, chaveIdempotencia: string): Promise<Reporte> {
      await esperar();
      const usuarioId = usuarioAtual();
      if (!chaveIdempotencia.trim()) {
        throw new ErroApi(400, 'Falta o cabeçalho Idempotency-Key.');
      }

      const campos: Record<string, string> = {};
      validarDescricao(dados.descricao, campos);
      const categoria = CATEGORIAS_FALSAS.find((c) => c.id === dados.categoriaId);
      if (!categoria) campos.categoriaId = 'Escolha uma categoria.';
      if (!(dados.latitude >= -90 && dados.latitude <= 90))
        campos.latitude = 'Localização inválida.';
      if (!(dados.longitude >= -180 && dados.longitude <= 180)) {
        campos.longitude = 'Localização inválida.';
      }
      if (!URGENCIAS.includes(dados.urgencia)) campos.urgencia = 'Escolha a urgência.';
      if (Object.keys(campos).length > 0 || !categoria) throw erroDeCampos(campos);

      // Idempotencia: mesma chave + mesmo usuario. Mesmo corpo devolve a resposta guardada;
      // corpo diferente e 422. Repetir uma chave nao conta no limite por minuto.
      const corpo = JSON.stringify({
        categoriaId: dados.categoriaId,
        descricao: dados.descricao.trim(),
        latitude: dados.latitude,
        longitude: dados.longitude,
        endereco: dados.endereco ?? null,
        fotoUrl: dados.fotoUrl ?? null,
        urgencia: dados.urgencia,
      });
      const chave = `${usuarioId}:${chaveIdempotencia}`;
      const guardada = respostasIdempotentes.get(chave);
      if (guardada) {
        if (guardada.corpo !== corpo) {
          throw new ErroApi(422, 'Esta chave já foi usada com outro conteúdo.');
        }
        return copiar(guardada.resposta);
      }

      const agoraMs = agora();
      const recentes = (criacoesPorUsuario.get(usuarioId) ?? []).filter(
        (instante) => agoraMs - instante < JANELA_MS,
      );
      if (recentes.length >= CRIACOES_POR_JANELA) {
        criacoesPorUsuario.set(usuarioId, recentes);
        throw new ErroApi(429, 'Muitas tentativas. Espere um pouco e tente de novo.');
      }
      criacoesPorUsuario.set(usuarioId, [...recentes, agoraMs]);

      const id = proximoId++;
      const instante = agoraIso();
      const reporte: ReporteArmazenado = {
        usuarioId,
        id,
        protocolo: `VV-2026-${String(id).padStart(6, '0')}`,
        categoria,
        descricao: dados.descricao.trim(),
        urgencia: dados.urgencia,
        status: 'ABERTO',
        latitude: dados.latitude,
        longitude: dados.longitude,
        endereco: dados.endereco,
        fotoUrl: dados.fotoUrl,
        criadoEm: instante,
        atualizadoEm: instante,
        historico: [{ statusAnterior: null, statusNovo: 'ABERTO', criadoEm: instante }],
      };
      reportes.set(id, reporte);
      const resposta = semDono(reporte);
      respostasIdempotentes.set(chave, { corpo, resposta: copiar(resposta) });
      return resposta;
    },

    async listarMeus(pagina: number, tamanho: number): Promise<Pagina<ReporteResumo>> {
      await esperar();
      const usuarioId = usuarioAtual();
      if (
        !Number.isInteger(pagina) ||
        pagina < 1 ||
        !Number.isInteger(tamanho) ||
        tamanho < 1 ||
        tamanho > TAMANHO_MAXIMO_DA_PAGINA
      ) {
        throw new ErroApi(400, 'Página ou tamanho inválido.');
      }
      // Do mais novo ao mais antigo; o id desempata reportes criados no mesmo instante.
      const meus = [...reportes.values()]
        .filter((r) => r.usuarioId === usuarioId)
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm) || b.id - a.id);
      const itens = meus.slice((pagina - 1) * tamanho, pagina * tamanho).map((r) => ({
        id: r.id,
        protocolo: r.protocolo,
        categoria: copiar(r.categoria),
        descricao: r.descricao,
        urgencia: r.urgencia,
        status: r.status,
        criadoEm: r.criadoEm,
      }));
      return { itens, pagina, tamanho, total: meus.length };
    },

    async obter(id: number): Promise<Reporte> {
      await esperar();
      return semDono(reporteDoUsuario(id, usuarioAtual()));
    },

    async editar(id: number, dados: DadosEdicaoReporte): Promise<Reporte> {
      await esperar();
      const reporte = reporteDoUsuario(id, usuarioAtual());
      if (reporte.status !== 'ABERTO') {
        throw new ErroApi(409, 'Só é possível editar um reporte que ainda está em aberto.');
      }
      const campos: Record<string, string> = {};
      validarDescricao(dados.descricao, campos);
      if (Object.keys(campos).length > 0) throw erroDeCampos(campos);

      reporte.descricao = dados.descricao.trim();
      if (dados.fotoUrl === null) delete reporte.fotoUrl;
      else if (dados.fotoUrl !== undefined) reporte.fotoUrl = dados.fotoUrl;
      reporte.atualizadoEm = agoraIso();
      return semDono(reporte);
    },

    async cancelar(id: number): Promise<void> {
      await esperar();
      const reporte = reporteDoUsuario(id, usuarioAtual());
      if (reporte.status !== 'ABERTO') {
        throw new ErroApi(409, 'Só é possível cancelar um reporte que ainda está em aberto.');
      }
      const instante = agoraIso();
      reporte.status = 'CANCELADO';
      reporte.atualizadoEm = instante;
      reporte.historico.push({
        statusAnterior: 'ABERTO',
        statusNovo: 'CANCELADO',
        criadoEm: instante,
      });
    },
  };
}
