import { ErroApi } from '../erro';
import type { DadosNovoReporte } from '../types';
import { criarAuthApiFalsa } from './auth-api-falsa';
import { criarReportesApiFalsa } from './reportes-api-falsa';

const dadosBase: DadosNovoReporte = {
  categoriaId: 1,
  descricao: 'A calçada em frente ao número 120 está toda quebrada.',
  latitude: -23.55,
  longitude: -46.63,
  endereco: 'Rua das Flores, 120',
  urgencia: 'ALTA',
};

// Monta a API falsa de reportes com duas contas de teste (Ana e Bia). "usar" escolhe quem esta
// logada; "avancar" anda o relogio simulado (para testar o limite por minuto).
async function montar() {
  const auth = criarAuthApiFalsa();
  const tokens = new Map<string, string>();
  let tokenAtual: string | null = null;
  let agora = Date.parse('2026-11-13T12:00:00.000Z');

  for (const nome of ['Ana', 'Bia']) {
    const email = `${nome.toLowerCase()}@exemplo.com`;
    await auth.cadastrar({
      nome,
      email,
      telefone: '11999999999',
      senha: 'Senha@123',
      role: 'CIDADAO',
      consentimento: true,
    });
    tokens.set(nome, (await auth.login(email, 'Senha@123')).token);
  }

  const api = criarReportesApiFalsa({
    obterToken: () => tokenAtual,
    idDoToken: auth.idDoToken,
    agora: () => agora,
  });

  return {
    api,
    auth,
    tokens,
    usar: (nome: string | null) => {
      tokenAtual = nome === null ? null : (tokens.get(nome) ?? null);
    },
    avancar: (ms: number) => {
      agora += ms;
    },
  };
}

async function erroDe(promessa: Promise<unknown>): Promise<ErroApi> {
  const erro = await promessa.then(
    () => null,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(ErroApi);
  return erro as ErroApi;
}

describe('criarReportesApiFalsa', () => {
  describe('categorias', () => {
    it('lista as 8 categorias do plano unico', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const categorias = await api.listarCategorias();
      expect(categorias.map((c) => c.codigo)).toEqual([
        'CALCADA',
        'RAMPA',
        'BURACO',
        'ILUMINACAO',
        'SEMAFORO_SONORO',
        'PISO_TATIL',
        'LIXO',
        'OUTRO',
      ]);
      expect(categorias[0]).toMatchObject({ id: 1, nome: 'Calçada quebrada' });
    });
  });

  describe('sessao', () => {
    it('sem token, toda chamada responde 401', async () => {
      const { api, usar } = await montar();
      usar(null);
      expect((await erroDe(api.listarCategorias())).status).toBe(401);
      expect((await erroDe(api.criar(dadosBase, 'k1'))).status).toBe(401);
      expect((await erroDe(api.listarMeus(1, 10))).status).toBe(401);
      expect((await erroDe(api.obter(1))).status).toBe(401);
      expect((await erroDe(api.editar(1, { descricao: 'x'.repeat(10) }))).status).toBe(401);
      expect((await erroDe(api.cancelar(1))).status).toBe(401);
    });

    it('com a conta excluida, o token deixa de valer (401)', async () => {
      const { api, auth, tokens, usar } = await montar();
      usar('Ana');
      await auth.excluirConta(tokens.get('Ana') as string);
      expect((await erroDe(api.listarMeus(1, 10))).status).toBe(401);
    });
  });

  describe('criar', () => {
    it('cria ABERTO, com protocolo VV-2026-000001, historico e categoria resolvida', async () => {
      const { api, usar } = await montar();
      usar('Ana');

      const reporte = await api.criar(dadosBase, 'chave-1');

      expect(reporte).toMatchObject({
        protocolo: 'VV-2026-000001',
        status: 'ABERTO',
        urgencia: 'ALTA',
        descricao: dadosBase.descricao,
        latitude: -23.55,
        longitude: -46.63,
        endereco: 'Rua das Flores, 120',
        categoria: { id: 1, codigo: 'CALCADA' },
        criadoEm: '2026-11-13T12:00:00.000Z',
        atualizadoEm: '2026-11-13T12:00:00.000Z',
      });
      expect(reporte.historico).toEqual([
        { statusAnterior: null, statusNovo: 'ABERTO', criadoEm: '2026-11-13T12:00:00.000Z' },
      ]);
    });

    it('o protocolo e sequencial entre reportes (mesmo de pessoas diferentes)', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      await api.criar(dadosBase, 'k1');
      usar('Bia');
      const segundo = await api.criar(dadosBase, 'k2');
      expect(segundo.protocolo).toBe('VV-2026-000002');
    });

    it('guarda a foto quando vem fotoUrl', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const reporte = await api.criar({ ...dadosBase, fotoUrl: 'https://f/1.jpg' }, 'k1');
      expect(reporte.fotoUrl).toBe('https://f/1.jpg');
    });

    it('recusa descricao vazia ou curta (400, com o campo)', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      for (const descricao of ['', '   ', 'curta']) {
        const erro = await erroDe(api.criar({ ...dadosBase, descricao }, 'k1'));
        expect(erro.status).toBe(400);
        expect(erro.campos.descricao).toBeDefined();
      }
    });

    it('recusa descricao com mais de 500 caracteres', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const erro = await erroDe(api.criar({ ...dadosBase, descricao: 'a'.repeat(501) }, 'k1'));
      expect(erro.status).toBe(400);
      expect(erro.campos.descricao).toBeDefined();
    });

    it('recusa categoria que nao existe', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const erro = await erroDe(api.criar({ ...dadosBase, categoriaId: 99 }, 'k1'));
      expect(erro.status).toBe(400);
      expect(erro.campos.categoriaId).toBeDefined();
    });

    it('recusa coordenadas fora do mundo', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const a = await erroDe(api.criar({ ...dadosBase, latitude: 91 }, 'k1'));
      const b = await erroDe(api.criar({ ...dadosBase, longitude: -181 }, 'k2'));
      expect(a.campos.latitude).toBeDefined();
      expect(b.campos.longitude).toBeDefined();
    });

    it('sem chave de idempotencia, responde 400', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      expect((await erroDe(api.criar(dadosBase, ''))).status).toBe(400);
    });
  });

  describe('idempotencia (plano unico, 8.2)', () => {
    it('mesma chave e mesmo corpo devolvem o MESMO reporte, sem criar outro', async () => {
      const { api, usar } = await montar();
      usar('Ana');

      const primeiro = await api.criar(dadosBase, 'chave-1');
      const repetido = await api.criar({ ...dadosBase }, 'chave-1');

      expect(repetido).toEqual(primeiro);
      const lista = await api.listarMeus(1, 10);
      expect(lista.total).toBe(1);
    });

    it('mesma chave com corpo diferente responde 422', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      await api.criar(dadosBase, 'chave-1');

      const erro = await erroDe(api.criar({ ...dadosBase, urgencia: 'BAIXA' }, 'chave-1'));

      expect(erro.status).toBe(422);
    });

    it('a mesma chave de outra pessoa nao colide: cria um reporte novo', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const deAna = await api.criar(dadosBase, 'chave-1');
      usar('Bia');
      const deBia = await api.criar(dadosBase, 'chave-1');
      expect(deBia.id).not.toBe(deAna.id);
    });
  });

  describe('limite de criacoes por minuto (429)', () => {
    it('a 6a criacao no mesmo minuto responde 429; depois de um minuto, libera', async () => {
      const { api, usar, avancar } = await montar();
      usar('Ana');
      for (let i = 1; i <= 5; i++) await api.criar(dadosBase, `k${i}`);

      const erro = await erroDe(api.criar(dadosBase, 'k6'));
      expect(erro.status).toBe(429);
      expect(erro.message).toBe('Muitas tentativas. Espere um pouco e tente de novo.');

      avancar(61_000);
      await expect(api.criar(dadosBase, 'k6')).resolves.toMatchObject({ status: 'ABERTO' });
    });

    it('repetir uma chave ja usada nao conta como nova criacao (nem leva 429)', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const primeiro = await api.criar(dadosBase, 'k1');
      for (let i = 2; i <= 5; i++) await api.criar(dadosBase, `k${i}`);

      await expect(api.criar(dadosBase, 'k1')).resolves.toEqual(primeiro);
    });

    it('o limite e por pessoa', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      for (let i = 1; i <= 5; i++) await api.criar(dadosBase, `k${i}`);
      usar('Bia');
      await expect(api.criar(dadosBase, 'b1')).resolves.toMatchObject({ status: 'ABERTO' });
    });
  });

  describe('listarMeus', () => {
    it('lista so os reportes da pessoa logada, do mais novo ao mais antigo', async () => {
      const { api, usar, avancar } = await montar();
      usar('Ana');
      const a1 = await api.criar({ ...dadosBase, descricao: 'Primeiro reporte da Ana.' }, 'k1');
      avancar(1000);
      const a2 = await api.criar({ ...dadosBase, descricao: 'Segundo reporte da Ana.' }, 'k2');
      usar('Bia');
      await api.criar({ ...dadosBase, descricao: 'Reporte da Bia aqui.' }, 'k3');

      usar('Ana');
      const pagina = await api.listarMeus(1, 10);

      expect(pagina.itens.map((r) => r.id)).toEqual([a2.id, a1.id]);
      expect(pagina).toMatchObject({ pagina: 1, tamanho: 10, total: 2 });
    });

    it('o resumo traz so o que a lista precisa (sem historico nem foto)', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      await api.criar({ ...dadosBase, fotoUrl: 'https://f/1.jpg' }, 'k1');
      const [item] = (await api.listarMeus(1, 10)).itens;
      expect(item).toEqual({
        id: expect.any(Number),
        protocolo: 'VV-2026-000001',
        categoria: expect.objectContaining({ codigo: 'CALCADA' }),
        descricao: dadosBase.descricao,
        urgencia: 'ALTA',
        status: 'ABERTO',
        criadoEm: '2026-11-13T12:00:00.000Z',
      });
    });

    it('pagina: 3 reportes com tamanho 2 viram 2 paginas', async () => {
      const { api, usar, avancar } = await montar();
      usar('Ana');
      for (let i = 1; i <= 3; i++) {
        await api.criar({ ...dadosBase, descricao: `Reporte numero ${i} da Ana.` }, `k${i}`);
        avancar(1000);
      }

      const p1 = await api.listarMeus(1, 2);
      const p2 = await api.listarMeus(2, 2);
      const p3 = await api.listarMeus(3, 2);

      expect(p1.itens).toHaveLength(2);
      expect(p1.total).toBe(3);
      expect(p2.itens).toHaveLength(1);
      expect(p2.itens[0].descricao).toBe('Reporte numero 1 da Ana.');
      expect(p3.itens).toHaveLength(0);
    });

    it('recusa pagina ou tamanho invalidos (400)', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      expect((await erroDe(api.listarMeus(0, 10))).status).toBe(400);
      expect((await erroDe(api.listarMeus(1, 0))).status).toBe(400);
      expect((await erroDe(api.listarMeus(1, 51))).status).toBe(400);
    });
  });

  describe('obter', () => {
    it('o dono ve o reporte completo', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const criado = await api.criar(dadosBase, 'k1');
      await expect(api.obter(criado.id)).resolves.toEqual(criado);
    });

    it('reporte de outra pessoa responde 404 (nao revela que existe)', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const criado = await api.criar(dadosBase, 'k1');
      usar('Bia');
      expect((await erroDe(api.obter(criado.id))).status).toBe(404);
    });

    it('id que nao existe responde 404', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      expect((await erroDe(api.obter(999))).status).toBe(404);
    });
  });

  describe('editar', () => {
    it('muda a descricao e o atualizadoEm, e mantem a foto quando fotoUrl nao vem', async () => {
      const { api, usar, avancar } = await montar();
      usar('Ana');
      const criado = await api.criar({ ...dadosBase, fotoUrl: 'https://f/1.jpg' }, 'k1');
      avancar(5000);

      const editado = await api.editar(criado.id, { descricao: 'Descricao nova e mais clara.' });

      expect(editado.descricao).toBe('Descricao nova e mais clara.');
      expect(editado.fotoUrl).toBe('https://f/1.jpg');
      expect(editado.atualizadoEm).toBe('2026-11-13T12:00:05.000Z');
      expect(editado.criadoEm).toBe('2026-11-13T12:00:00.000Z');
      await expect(api.obter(criado.id)).resolves.toEqual(editado);
    });

    it('troca a foto com um texto e remove com null', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const criado = await api.criar({ ...dadosBase, fotoUrl: 'https://f/1.jpg' }, 'k1');
      const trocada = await api.editar(criado.id, {
        descricao: dadosBase.descricao,
        fotoUrl: 'https://f/2.jpg',
      });
      expect(trocada.fotoUrl).toBe('https://f/2.jpg');
      const removida = await api.editar(criado.id, {
        descricao: dadosBase.descricao,
        fotoUrl: null,
      });
      expect(removida.fotoUrl).toBeUndefined();
    });

    it('recusa descricao invalida (400)', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const criado = await api.criar(dadosBase, 'k1');
      const erro = await erroDe(api.editar(criado.id, { descricao: 'curta' }));
      expect(erro.status).toBe(400);
      expect(erro.campos.descricao).toBeDefined();
    });

    it('reporte de outra pessoa responde 404', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const criado = await api.criar(dadosBase, 'k1');
      usar('Bia');
      const erro = await erroDe(api.editar(criado.id, { descricao: 'Tentando editar o da Ana.' }));
      expect(erro.status).toBe(404);
    });

    it('depois de cancelado, nao da mais para editar (409)', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const criado = await api.criar(dadosBase, 'k1');
      await api.cancelar(criado.id);
      const erro = await erroDe(api.editar(criado.id, { descricao: 'Tarde demais para editar.' }));
      expect(erro.status).toBe(409);
      expect(erro.message).toBe('Só é possível editar um reporte que ainda está em aberto.');
    });
  });

  describe('cancelar', () => {
    it('muda para CANCELADO e registra no historico', async () => {
      const { api, usar, avancar } = await montar();
      usar('Ana');
      const criado = await api.criar(dadosBase, 'k1');
      avancar(2000);

      await api.cancelar(criado.id);

      const depois = await api.obter(criado.id);
      expect(depois.status).toBe('CANCELADO');
      expect(depois.atualizadoEm).toBe('2026-11-13T12:00:02.000Z');
      expect(depois.historico).toEqual([
        { statusAnterior: null, statusNovo: 'ABERTO', criadoEm: '2026-11-13T12:00:00.000Z' },
        { statusAnterior: 'ABERTO', statusNovo: 'CANCELADO', criadoEm: '2026-11-13T12:00:02.000Z' },
      ]);
    });

    it('o reporte cancelado continua na lista, com o novo status', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const criado = await api.criar(dadosBase, 'k1');
      await api.cancelar(criado.id);
      const { itens } = await api.listarMeus(1, 10);
      expect(itens).toHaveLength(1);
      expect(itens[0].status).toBe('CANCELADO');
    });

    it('cancelar duas vezes responde 409', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const criado = await api.criar(dadosBase, 'k1');
      await api.cancelar(criado.id);
      const erro = await erroDe(api.cancelar(criado.id));
      expect(erro.status).toBe(409);
      expect(erro.message).toBe('Só é possível cancelar um reporte que ainda está em aberto.');
    });

    it('reporte de outra pessoa responde 404', async () => {
      const { api, usar } = await montar();
      usar('Ana');
      const criado = await api.criar(dadosBase, 'k1');
      usar('Bia');
      expect((await erroDe(api.cancelar(criado.id))).status).toBe(404);
    });
  });

  // Na API real, o cliente HTTP avisa o app num 401 com token (sessao vencida) e o app volta ao
  // login. A API falsa faz o mesmo: sem isso, depois de reiniciar o servidor de desenvolvimento
  // (que zera a "base" em memoria) o app ficaria logado, mas so recebendo erro.
  describe('aoNaoAutorizado', () => {
    it('avisa o app quando o token nao vale', async () => {
      const auth = criarAuthApiFalsa();
      const aoNaoAutorizado = jest.fn();
      const api = criarReportesApiFalsa({
        obterToken: () => 'token-velho',
        idDoToken: auth.idDoToken,
        aoNaoAutorizado,
      });

      expect((await erroDe(api.listarMeus(1, 10))).status).toBe(401);

      expect(aoNaoAutorizado).toHaveBeenCalledTimes(1);
    });

    it('nao avisa quando nem havia token (nao e sessao vencida)', async () => {
      const auth = criarAuthApiFalsa();
      const aoNaoAutorizado = jest.fn();
      const api = criarReportesApiFalsa({
        obterToken: () => null,
        idDoToken: auth.idDoToken,
        aoNaoAutorizado,
      });

      expect((await erroDe(api.listarMeus(1, 10))).status).toBe(401);

      expect(aoNaoAutorizado).not.toHaveBeenCalled();
    });
  });
});
