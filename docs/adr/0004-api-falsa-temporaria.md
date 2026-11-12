# ADR 0004: API falsa temporária no desenvolvimento

- **Status:** aceita (temporária)
- **Data:** 11/11/2026

## Contexto

As APIs Java e .NET ainda estão sendo feitas por outras pessoas do grupo. O app precisa avançar
já (login, cadastro e telas), mas o PDF exige que os dados sejam guardados e lidos pela API,
"nunca apenas no dispositivo".

## Decisão

Definir um **contrato** (uma interface TypeScript) para cada API e criar duas implementações: a
**real**, com `fetch`, e uma **falsa**, em memória. A variável `EXPO_PUBLIC_USE_FAKE_API` escolhe
qual usar. A falsa serve só para desenvolver e testar; na entrega o valor é `false`.

## Alternativas

- **Esperar as APIs ficarem prontas:** bloqueia o Mobile por dias e junta tudo no fim.
- **Escrever o app já falando com as APIs reais:** depende de elas estarem no ar e de o contrato
  não mudar.

## Consequências

- O app e as APIs podem ser feitos em paralelo, seguindo o contrato do plano único.
- Os testes não dependem de rede.
- Há um risco: a API falsa pode ficar diferente da real. Por isso o contrato (JWT, erros 401/409,
  formato dos campos) vem do plano único, e a troca para as APIs reais é testada antes da entrega.
