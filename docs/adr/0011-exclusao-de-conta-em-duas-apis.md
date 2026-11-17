# ADR 0011: exclusão de conta em duas APIs (.NET e Java)

- **Status:** aceita
- **Data:** 17/11/2026

## Contexto

Os dados de uma pessoa moram em dois servidores: a API **Java** guarda a conta, o perfil de
emergência, os contatos, os socorros, os avisos e o histórico de voz; a API **.NET** guarda os
reportes de zeladoria, o histórico deles e as fotos. A LGPD dá à pessoa o direito de apagar os
próprios dados, e a tela de Privacidade tem o botão "Excluir minha conta".

Até 16/11 só o Java tinha endpoint de exclusão, e a política de privacidade dizia a verdade para
aquele momento: os reportes ficavam com a equipe, sem nome nem e-mail. Em 17/11 o time .NET publicou
`DELETE /api/usuarios/eu` (204): apaga reportes, histórico, fotos e cadastro de lá e guarda o id numa
lista de contas excluídas, de modo que **qualquer token dessa conta passa a dar 401 no .NET**. O código
deles pede que "o app chame este endpoint antes do `DELETE /api/v1/auth/eu` da API Java, com o mesmo
token".

Provado na API .NET real (SQLite temporário, token de teste): 1º `DELETE /api/usuarios/eu` = 204 e os
reportes do usuário caíram de 1 para 0 no banco; repetir com o mesmo token = 401; `GET /api/reportes/meus`
com ele = 401.

## Decisão

1. **Ordem: .NET primeiro, Java depois.** É o contrato do time .NET, e a ordem inversa deixaria dados
   pessoais órfãos no .NET: sem conta no Java a pessoa não consegue entrar, então não teria como
   tentar de novo.
2. **A composição fica no adaptador real de autenticação** (`real/auth-api-real.ts`): o contrato
   `AuthApi.excluirConta(token)` não mudou, então `AuthContext` e `TelaPrivacidade` continuam chamando
   uma coisa só. A fábrica passa o cliente do .NET ao adaptador.
3. **O 401 do .NET significa "já excluída lá".** Sem tratamento, a nova tentativa depois de uma falha do
   Java bateria nesse 401, e o cliente HTTP trata todo 401 com token como "sessão venceu" e **desloga o
   app**, deixando a conta do Java viva. Por isso a chamada ao .NET usa a opção
   `naoDeslogarEm401` do cliente HTTP, e o 401 segue para o passo do Java. Se o token venceu de verdade,
   o Java também responde 401 e o app volta ao login do mesmo jeito.
4. **Qualquer outro erro do .NET (rede, 5xx, 403) para tudo.** Nada foi apagado e a mensagem diz que a
   conta não foi excluída.
5. **Exclusão parcial é dita em voz alta.** Se o .NET respondeu 204 e o Java falhou, o adaptador lança
   `ErroExclusaoParcial` (um `ErroApi` com o status do Java) e a tela diz que os reportes já foram
   apagados, mas a conta ainda não, e pede para tocar em "Excluir minha conta" de novo. Só se marca
   parcial quando o 204 do .NET foi visto; com 401 não se sabe o que aconteceu.
6. **A Política de Privacidade e o README passam a dizer que os reportes também são apagados**, com o
   histórico e as fotos; e que cancelar um reporte só muda o status, e o registro continua guardado até
   a conta ser excluída.

## Alternativas

- **Java primeiro, .NET depois:** descartada. Falhar no segundo passo deixaria reportes (dados pessoais)
  sem dono e sem como a pessoa tentar de novo.
- **Continuar chamando só o Java** (como antes): descartada. Os reportes e as fotos ficariam no .NET e a
  política teria de seguir dizendo que "não somem", o que contraria o direito de apagar da LGPD.
- **Não tratar o 401 do .NET:** descartada. O segundo toque em "Excluir" deslogaria a pessoa e a conta do
  Java ficaria viva.
- **Um endpoint do backend que orquestre as duas exclusões:** seria o ideal, mas depende de os dois
  times mudarem a arquitetura a poucos dias da entrega.

## Consequências

- A exclusão passa a fazer duas chamadas em série (um pouco mais lenta) e pode terminar pela metade;
  isso agora é um caso tratado, testado e explicado ao usuário.
- **Limite conhecido:** se a exclusão ficar parcial e a pessoa desistir de tentar de novo, as telas que
  falam com o .NET (como "Meus reportes") recebem 401 e o app volta ao login; a conta do Java continua
  existindo. Basta tocar em "Excluir minha conta" de novo para concluir.
- A API **falsa** não apaga os reportes ao excluir a conta: o token da conta excluída deixa de valer
  (como no .NET) e os ids nunca são reaproveitados, então os dados esquecidos na memória seriam
  inalcançáveis e não há como testar esse efeito.
- Se o time .NET trocar o status de uma exclusão repetida (hoje 401), o tratamento do passo 3 precisa
  ser revisto.
