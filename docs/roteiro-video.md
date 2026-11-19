# Roteiro do vídeo (Mobile Application Development)

Guia para gravar o vídeo da entrega de mobile (requisito **R6**).

| Regra do enunciado                                  | Como fica                                                             |
| --------------------------------------------------- | --------------------------------------------------------------------- |
| App funcionando, em emulador ou no celular          | Celular Android com o APK do Firebase App Distribution, ou o emulador |
| Mostrar autenticação, navegação, CRUD e usabilidade | Blocos 2 a 5 abaixo                                                   |
| **Máximo de 5 minutos**                             | Meta de **4 min 40 s**                                                |
| YouTube público ou não listado                      | Suba como **não listado** e teste o link numa aba anônima             |
| Link no `.txt` e no README.md                       | Troque o "_link a preencher_" do README depois de subir               |

## Antes de gravar (fora do vídeo, 10 min)

1. **Gere o APK a partir do último commit da `main`.** A tela "Sobre o App" mostra o hash do commit, e o
   enunciado (R7) exige que a versão publicada seja idêntica ao código enviado. Depois de gerar, não faça mais
   commits na `main` até entregar.
2. **Acorde a API**: abra https://app-vozviva-rm562312.azurewebsites.net/actuator/health no navegador um ou dois
   minutos antes. A primeira chamada depois de um tempo parada pode levar uns 15 segundos.
3. **Celular ou emulador:**
   - letra do sistema no tamanho normal, notificações desligadas e volume alto (o app fala as respostas);
   - no emulador, coloque a localização em Osasco (latitude `-23.52648`, longitude `-46.77665`), onde ficam os
     locais de atendimento carregados.
4. **Num bloco de notas**, deixe prontos:
   - um e-mail novo para o cadastro, por exemplo `maria.video.<hora>@vozviva.dev`, e uma senha de teste com letra
     e número;
   - a mensagem de golpe: `INSS: seu benefício será bloqueado hoje. Para regularizar, informe sua senha no link bit.ly/inss-regulariza`.
5. Comece com o app **deslogado**, na tela de login.

## Gravação (4 min 40 s)

| Tempo       | Bloco                                                                 | Requisito        |
| ----------- | --------------------------------------------------------------------- | ---------------- |
| 0:00 – 0:20 | 1. Abertura                                                           | Tema CitizenTech |
| 0:20 – 1:10 | 2. Cadastro, login e rotas protegidas                                 | R3               |
| 1:10 – 2:30 | 3. CRUD pela API (contatos e perfil na API Java, reporte na API .NET) | R2               |
| 2:30 – 3:50 | 4. Navegação e usabilidade: assistente, É golpe?, Atendimento perto   | R1 e usabilidade |
| 3:50 – 4:20 | 5. Sobre o App (hash do commit) e logout                              | R7 e R3          |
| 4:20 – 4:40 | 6. Fechamento                                                         |                  |

As falas são uma sugestão; fale com as suas palavras e mostre a tela enquanto fala.

### 1. Abertura (0:00 – 0:20)

> "Este é o Voz & Via, o app do nosso grupo para pessoas idosas e pessoas com deficiência. Por voz ou com um
> toque, a pessoa pede socorro, confere se uma mensagem é golpe, acha o atendimento acessível mais perto e
> reporta problemas na rua. O app usa duas APIs publicadas na Azure: a Java e a .NET."

### 2. Cadastro, login e rotas protegidas (0:20 – 1:10)

1. Na tela de login, toque em **Entrar** com os campos vazios: aparecem as mensagens de validação.
   > "Os formulários validam antes de enviar."
2. Toque em **Criar conta**. Preencha **Nome**, **E-mail** e **Senha**, escolha o **Tipo de conta** (Cidadão),
   marque o consentimento da privacidade e toque em **Criar conta**.
   > "O cadastro vai para a API Java, que grava a senha com BCrypt e pede o consentimento da LGPD."
3. Entre com o mesmo e-mail e senha. Mostre o indicador de carregamento e a tela de **Início** com o seu nome.
   > "O login devolve um token JWT, guardado no cofre seguro do celular. As outras telas só abrem com sessão."

### 3. CRUD pela API (1:10 – 2:30)

**Perfil de emergência (API Java):**

1. No Início, abra **Contatos**. Sem perfil, o app pede para criar: toque em **Criar meu perfil de emergência**,
   escolha a **Mobilidade** (Cadeirante), escreva os **Medicamentos** e salve.
   > "O perfil vai junto da mensagem de socorro para os contatos."

**Contatos de emergência (API Java), o CRUD completo:** 2. **Criar:** toque em **Novo contato**, preencha **Nome** (Ana Souza), **Telefone com DDD**, **Parentesco**
(Filha) e **Prioridade** (1). Toque em **Salvar contato**. 3. **Ler:** o contato aparece na lista, com o telefone formatado pela API. 4. **Atualizar:** toque no contato, mude o parentesco ou o telefone e salve. A lista mostra a mudança. 5. **Excluir:** abra o contato, toque em **Excluir contato** e confirme. Crie a Ana de novo, porque o bloco 4 usa
ela (ou deixe outro contato salvo antes de gravar).

> "Tudo vai para a API: nada fica só no celular. Se a internet cair, o app avisa e oferece tentar de novo."

**Reporte de zeladoria (API .NET), rápido:** 6. Volte ao Início, toque em **Reportar problema**, escolha a **Categoria** (Calçada), escreva a **Descrição**,
use a localização e toque em enviar. Mostre o protocolo e abra **Meus reportes**.

> "O mesmo login vale na API .NET, que guarda os reportes da prefeitura."

### 4. Navegação e usabilidade (2:30 – 3:50)

1. **Assistente por voz:** toque no microfone e diga **"Como eu peço minha aposentadoria?"**. O app lê a
   resposta e mostra o cartão **Orientação**, com os passos, o botão do site oficial e o **Ligar 135**. Toque em
   **Ouvir mais devagar**.
   > "A IA entende a pergunta, mas o link e o telefone vêm de uma base oficial, nunca inventados."
2. **É golpe?:** volte e toque em **É golpe?**. Cole a mensagem do INSS, escolha **SMS** e toque em **Verificar a
   mensagem**. Mostre o selo **Verificação de golpe**, o **Provável golpe** e o botão **Ligar 135**.
3. Na mesma tela, toque em **Já caí num golpe**: aparece o selo **Ajuda contra golpe**, com o que fazer agora
   (banco, devolução do Pix pelo MED, boletim).
   > "Conferir uma mensagem e ajudar quem já caiu num golpe são ajudas diferentes, e o app mostra isso."
4. **Atendimento perto:** volte, toque em **Atendimento perto**, escolha **Hospital**, marque **Preciso de
   acessibilidade** e toque em **Buscar perto de mim**. Mostre a lista, o **Ligar 192** e o caminho até o mais
   perto.
5. **Pedir ajuda** (só mostre a tela): abra **Pedir ajuda** e mostre que nada sai sem tocar em **Sim, avisar meus
   contatos**, e que o **Ligar 192** fica sempre visível. Não precisa confirmar no vídeo.
   > "Botões grandes, fonte de leitura fácil, tudo funciona com leitor de tela, e a ação nunca acontece sem
   > confirmação."

### 5. Sobre o App e logout (3:50 – 4:20)

1. No Início, toque em **Sobre o app**. Mostre a versão e o **Commit do código**.
   > "Este é o hash do commit que gerou a versão publicada no Firebase App Distribution."
2. Abra o GitHub do app no navegador e mostre que o último commit da `main` tem o mesmo hash (os primeiros 7
   caracteres bastam).
3. Volte ao app, toque em **Sair**. O app volta para o login. Tente voltar com o botão do Android: as telas
   protegidas não abrem.
   > "O logout limpa a sessão e as rotas protegidas ficam bloqueadas."

### 6. Fechamento (4:20 – 4:40)

> "O Voz & Via tem login real, CRUD nas duas APIs, assistente por voz com IA e foco em acessibilidade, para que
> idosos e pessoas com deficiência resolvam a vida com a própria voz. Somos o grupo VozViva. Obrigado."

## Depois de gravar

1. Confira se o vídeo tem **menos de 5 minutos**.
2. Suba no YouTube como **não listado** e teste o link numa aba anônima.
3. Coloque o link no README.md (seção Entrega) e no `.txt` da entrega.
4. Confira no Firebase App Distribution se o e-mail do professor está como tester.
