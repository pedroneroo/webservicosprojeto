# Testes do Projeto Integrador

**Aluno:** Pedro Henrique Batista Barbier
**Data da execução:** 29/10/2026
**Ferramenta:** Thunder Client (testes manuais) e `node testes/testar.mjs` (testes automáticos)
**Resultado geral:** todos os cenários abaixo foram executados com os três serviços (`:3000`, `:3001`, `:3002`) e retornaram o esperado.

## Como reproduzir

1. Subir os três serviços (`npm install` e `npm run dev` em cada pasta, com o `.env` copiado do `.env.example`).
2. Testes automáticos, com os 3 serviços ligados: `node testes/testar.mjs`
3. Testes manuais de falha (itens 5, 6 e 7): parar ou atrasar os serviços como descrito na coluna "Como provocar".

> **Observação sobre o estoque:** o produto 1 começa com 8 unidades e cada pedido válido consome estoque. Depois de alguns pedidos o teste 1 passa a retornar 409, o que é o comportamento correto. Basta reiniciar o `catalogo-service` para o estoque voltar a 8.

## 1. Serviço de Pedidos (:3000)

| # | Cenário | Requisição / Como provocar | Status esperado | Resposta esperada | Resultado |
|---|---|---|---|---|---|
| 1 | Pedido válido | `POST /pedidos` `{"produtoId":1,"quantidade":2,"clienteEmail":"aluno@estudante.ifms.edu.br"}` | 201 | Pedido com `total: 189.9`, `status: "confirmado"`, `notificacaoStatus: "enviada"` | ✅ OK |
| 2 | Body incompleto | `POST /pedidos` `{"produtoId":1}` | 400 | `{"mensagem":"Dados do pedido são inválidos","codigo":"DADOS_INVALIDOS"}` | ✅ OK |
| 3 | Produto inexistente | `POST /pedidos` com `produtoId: 999` | 404 | `{"mensagem":"Produto não encontrado","codigo":"PRODUTO_NAO_ENCONTRADO"}` | ✅ OK |
| 4 | Sem estoque | `POST /pedidos` com `quantidade: 1000` | 409 | `{"mensagem":"Estoque insuficiente","codigo":"ESTOQUE_INSUFICIENTE"}` | ✅ OK |
| 5 | Catálogo fora do ar | Parar o `catalogo-service` (Ctrl+C) e repetir o teste 1 | 502 | `{"mensagem":"Catálogo indisponível","codigo":"CATALOGO_INDISPONIVEL"}` | ✅ OK |
| 6 | Catálogo lento (timeout) | Iniciar o Catálogo com `SIMULATE_DELAY_MS=5000` e repetir o teste 1 | 504 | `{"mensagem":"Catálogo demorou para responder","codigo":"CATALOGO_TIMEOUT"}` | ✅ OK |
| 7 | Notificações fora do ar | Parar o `notificacoes-service` e repetir o teste 1 | 201 | Pedido criado normalmente, com `notificacaoStatus: "pendente"` | ✅ OK |
| 8 | Rastreabilidade | Teste 1 com header `x-correlation-id: teste-123` | 201 | Mesmo header na resposta e `[teste-123]` nos logs dos 3 serviços | ✅ OK |
| 9 | Listar pedidos | `GET /pedidos` | 200 | Lista de pedidos | ✅ OK |
| 10 | Buscar pedido existente | `GET /pedidos/1` | 200 | O pedido 1 | ✅ OK |
| 11 | Buscar pedido inexistente | `GET /pedidos/99999` | 404 | `{"mensagem":"Pedido não encontrado","codigo":"PEDIDO_NAO_ENCONTRADO"}` | ✅ OK |

## 2. Serviço de Catálogo/Estoque (:3001)

| # | Cenário | Requisição | Status esperado | Resposta esperada | Resultado |
|---|---|---|---|---|---|
| 12 | Listar produtos | `GET /produtos` | 200 | Lista com 3 produtos | ✅ OK |
| 13 | Buscar produto existente | `GET /produtos/1` | 200 | Teclado Mecânico, preço 94.95 | ✅ OK |
| 14 | Buscar produto inexistente | `GET /produtos/999` | 404 | Erro padrão (`PRODUTO_NAO_ENCONTRADO`) | ✅ OK |
| 15 | Criar produto inválido | `POST /produtos` `{"nome":"","preco":-1,"estoque":"x"}` | 400 | Erro padrão (`DADOS_INVALIDOS`) | ✅ OK |
| 16 | Criar produto válido | `POST /produtos` `{"nome":"Webcam","preco":120,"estoque":5}` | 201 | Produto criado com `id` | ✅ OK |
| 17 | Reserva válida | `POST /produtos/1/reservas` `{"quantidade":2}` | 200 | `{"reservado":2,"estoqueRestante":6,"precoUnitario":94.95}` | ✅ OK |
| 18 | Reserva com quantidade inválida | `POST /produtos/1/reservas` `{"quantidade":-1}` | 400 | Erro padrão (`DADOS_INVALIDOS`) | ✅ OK |
| 19 | Reserva de produto inexistente | `POST /produtos/999/reservas` `{"quantidade":1}` | 404 | Erro padrão (`PRODUTO_NAO_ENCONTRADO`) | ✅ OK |
| 20 | Reserva acima do estoque | `POST /produtos/1/reservas` `{"quantidade":100000}` | 409 | Erro padrão (`ESTOQUE_INSUFICIENTE`) | ✅ OK |

## 3. Serviço de Notificações (:3002)

| # | Cenário | Requisição | Status esperado | Resposta esperada | Resultado |
|---|---|---|---|---|---|
| 21 | Registrar notificação | `POST /notificacoes` `{"pedidoId":17,"destino":"aluno@estudante.ifms.edu.br","mensagem":"Pedido 17 confirmado"}` | 201 | Notificação registrada | ✅ OK |
| 22 | Notificação inválida | `POST /notificacoes` `{"pedidoId":"abc"}` | 400 | Erro padrão (`DADOS_INVALIDOS`) | ✅ OK |
| 23 | Listar histórico | `GET /notificacoes` | 200 | Histórico das notificações | ✅ OK |

## Exemplo de rastreabilidade (teste 8)

Um único pedido gera logs com o mesmo `correlationId` nos três serviços:

```
[pedidos-service]      [teste-123] POST http://localhost:3001/produtos/1/reservas -> 200
[catalogo-service]     [teste-123] POST /produtos/1/reservas -> 200
[notificacoes-service] [teste-123] POST /notificacoes -> 201
[pedidos-service]      [teste-123] POST /pedidos -> 201
```

## Matriz mínima exigida (resumo)

| Cenário | Esperado | Resultado |
|---|---|---|
| Pedido válido | 201 + pedido + notificação enviada | ✅ |
| Body incompleto | 400 | ✅ |
| Produto inexistente | 404 | ✅ |
| Sem estoque | 409 | ✅ |
| Catálogo fora | 502 | ✅ |
| Catálogo lento | 504 | ✅ |
| Notificação fora | 201 + `notificacaoStatus` pendente | ✅ |
| Rastreabilidade | mesmo `correlationId` nos logs | ✅ |
