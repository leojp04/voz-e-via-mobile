// Texto da Politica de Privacidade, separado da tela para o teste conferir o conteudo e para
// revisar a redacao sem mexer em layout. Base: secao 10 do plano unico. Cada secao vira um
// cabecalho para o leitor de tela pular entre titulos.

export interface SecaoDePrivacidade {
  titulo: string;
  paragrafos: string[];
}

export const SECOES_DE_PRIVACIDADE: SecaoDePrivacidade[] = [
  {
    titulo: 'O que coletamos',
    paragrafos: [
      'Nome, e-mail e telefone, que você informa no cadastro.',
      'Sua localização, somente no momento em que você envia um reporte ou pede ajuda.',
      'A foto do problema, quando você reporta uma barreira na rua. Fotografe só o problema, sem rostos nem placas de carro.',
    ],
  },
  {
    titulo: 'Para que usamos',
    paragrafos: [
      'Nome e e-mail identificam a sua conta. O telefone permite que a equipe e os seus contatos falem com você.',
      'A localização e a foto mostram onde está o problema, para a zeladoria poder resolver.',
    ],
  },
  {
    titulo: 'Quem pode ver',
    paragrafos: [
      'Os seus reportes ficam visíveis para você e para a equipe que cuida da zeladoria.',
      'Os seus contatos de emergência só recebem um alerta quando você pede ajuda.',
      'Não vendemos nem repassamos os seus dados para publicidade.',
    ],
  },
  {
    titulo: 'O que não coletamos',
    paragrafos: [
      'Não perguntamos o tipo de deficiência nem dados de saúde.',
      'O áudio da sua voz vira texto no próprio aparelho e não sai do seu celular. Só o texto é enviado.',
    ],
  },
  {
    titulo: 'Seu consentimento',
    paragrafos: [
      'No cadastro você marca uma caixa para concordar com esta política. A caixa começa desmarcada.',
      'Sem o seu consentimento não é possível criar a conta.',
    ],
  },
  {
    titulo: 'Seus direitos',
    paragrafos: [
      'Conforme a LGPD (Lei Geral de Proteção de Dados), você pode ver, corrigir e apagar os seus dados.',
      'Para excluir a sua conta, peça ao grupo pelo contato abaixo.',
    ],
  },
  {
    titulo: 'Contato',
    paragrafos: [
      'Fale com o grupo Voz & Via pela equipe da disciplina de Mobile na FIAP (e-mail do grupo a definir).',
    ],
  },
  {
    titulo: 'Sobre este aplicativo',
    paragrafos: [
      'Voz & Via é um projeto acadêmico da Global Solution 2026/2. As contas são apenas de teste.',
    ],
  },
];
