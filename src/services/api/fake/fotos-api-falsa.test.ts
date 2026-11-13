import { ErroApi } from '../erro';
import { criarAuthApiFalsa } from './auth-api-falsa';
import { criarFotosApiFalsa } from './fotos-api-falsa';

async function montar() {
  const auth = criarAuthApiFalsa();
  await auth.cadastrar({
    nome: 'Maria',
    email: 'maria@exemplo.com',
    telefone: '11999999999',
    senha: 'Senha@123',
    role: 'CIDADAO',
    consentimento: true,
  });
  const { token } = await auth.login('maria@exemplo.com', 'Senha@123');
  let tokenAtual: string | null = token;
  const api = criarFotosApiFalsa({ obterToken: () => tokenAtual, idDoToken: auth.idDoToken });
  return { api, sair: () => (tokenAtual = null) };
}

const foto = { uri: 'file:///tmp/foto.jpg', nome: 'foto.jpg', tipo: 'image/jpeg' };

describe('criarFotosApiFalsa', () => {
  // A API falsa devolve o proprio endereco local como "URL": assim a foto aparece na tela
  // mesmo sem servidor de arquivos.
  it('aceita JPEG e devolve uma URL para a foto', async () => {
    const { api } = await montar();
    const resposta = await api.enviar(foto);
    expect(resposta.fotoUrl).toBe(foto.uri);
  });

  it('aceita PNG', async () => {
    const { api } = await montar();
    const resposta = await api.enviar({
      uri: 'file:///tmp/a.png',
      nome: 'a.png',
      tipo: 'image/png',
    });
    expect(resposta.fotoUrl).toBe('file:///tmp/a.png');
  });

  it.each(['image/gif', 'application/pdf', 'text/plain'])(
    'recusa o tipo %s com 400',
    async (tipo) => {
      const { api } = await montar();
      const erro = await api.enviar({ ...foto, tipo }).catch((e: unknown) => e);
      expect(erro).toBeInstanceOf(ErroApi);
      expect(erro).toMatchObject({ status: 400, message: 'Envie uma foto JPEG ou PNG.' });
    },
  );

  it('sem sessao, responde 401', async () => {
    const { api, sair } = await montar();
    sair();
    const erro = await api.enviar(foto).catch((e: unknown) => e);
    expect(erro).toMatchObject({ status: 401 });
  });

  it('avisa o app (aoNaoAutorizado) quando o token nao vale, como o 401 da API real', async () => {
    const auth = criarAuthApiFalsa();
    const aoNaoAutorizado = jest.fn();
    const api = criarFotosApiFalsa({
      obterToken: () => 'token-velho',
      idDoToken: auth.idDoToken,
      aoNaoAutorizado,
    });

    await expect(api.enviar(foto)).rejects.toMatchObject({ status: 401 });

    expect(aoNaoAutorizado).toHaveBeenCalledTimes(1);
  });
});
