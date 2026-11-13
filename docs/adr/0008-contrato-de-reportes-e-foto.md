# ADR 0008: contrato de reportes, foto em upload separado e erros do .NET

- **Status:** aceita
- **Data:** 12/11/2026

## Contexto

O CRUD de reportes (30 pontos da rubrica do Mobile) usa a API .NET (plano único, seção 8.2). O
plano diz que a foto fica em armazenamento de arquivos e que o banco guarda só a URL (decisão D9),
mas não diz **como a foto chega à API**. Além disso, a API .NET ainda não existe: o app precisa
avançar contra um contrato, como na autenticação (ADR 0004).

## Decisão

1. **Foto em upload separado.** Primeiro `POST /api/fotos` (multipart, campo `arquivo`, só JPEG e
   PNG) devolve `{ fotoUrl }`; depois `POST` ou `PUT /api/reportes` (JSON) leva só a `fotoUrl`.
2. **Idempotência.** O app gera um UUID ao abrir o formulário e o manda no cabeçalho
   `Idempotency-Key` do `POST /api/reportes`. A mesma chave é reutilizada em toda nova tentativa do
   mesmo envio, então toque duplo ou rede ruim não criam dois reportes.
3. **Dois servidores, uma sessão.** `criarApis` cria um cliente HTTP para o Java
   (`EXPO_PUBLIC_JAVA_API_URL`) e outro para o .NET (`EXPO_PUBLIC_DOTNET_API_URL`), ambos com o
   mesmo token e o mesmo tratamento de 401 (sessão vencida volta ao login).
4. **Erros nos dois formatos.** O cliente HTTP entende o erro do Java (`mensagem`, `campos[]`) e o
   ProblemDetails do ASP.NET (`detail`, `errors: { Campo: [mensagem] }`, nome do campo em
   minúsculo). O `title` do .NET vem em inglês e nunca é mostrado; sem `mensagem` nem `detail`
   vale o texto padrão em português. O 429 tem aviso próprio ("Muitas tentativas…").
5. **APIs falsas com as mesmas regras.** A versão falsa imita dono do reporte, 404 para reporte de
   outra pessoa, 409 fora do status ABERTO, idempotência (mesma chave e corpo → mesmo reporte;
   corpo diferente → 422) e o limite de 5 criações por minuto (429).

## Alternativas

- **Multipart no próprio reporte** (uma chamada só): a regra de idempotência do .NET compara o
  corpo da requisição, e comparar multipart é bem mais difícil do que comparar JSON.
- **Foto em base64 dentro do JSON:** uma chamada só, mas a foto de celular pesa vários MB (e o
  base64 acrescenta cerca de 33%). Ruim para quem tem pacote de dados limitado, que é o público.

## Consequências

- São duas chamadas para enviar um reporte com foto. Uma foto enviada cujo reporte não chega a ser
  criado fica "órfã" no armazenamento; a API .NET deve limpá-las depois de um tempo.
- **Contrato novo para quem faz a API .NET:** `POST /api/fotos` não estava no plano único; a seção
  8.2 deve ser atualizada.
- **Suposições a confirmar com quem faz a API .NET:** `page` começa em 1 e a resposta da lista traz
  `{ itens, pagina, tamanho, total }`; descrição de 10 a 500 caracteres.
- O app só esconde botões (editar e cancelar fora do status ABERTO); quem garante a regra é o
  servidor (409).
