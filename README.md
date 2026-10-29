# Projeto Integrador — Sistema Distribuído de Pedidos

**Disciplina:** Web Services — IFMS
**Professora:** Larissa Nunes
**Aluno:** Pedro Henrique Batista Barbier

## 1. Visão geral

Sistema de pedidos composto por **três microsserviços independentes** (TypeScript + Express), cada um com seus próprios dados e comunicando-se apenas por contratos HTTP.

| Serviço | Porta | Responsabilidade |
|---|---|---|
| `catalogo-service` | 3001 | Dono dos produtos, preços e estoque. Expõe consulta e reserva de estoque. |
| `pedidos-service` | 3000 | Recebe o pedido, reserva estoque no Catálogo, calcula o total, registra o pedido e solicita a notificação. |
| `notificacoes-service` | 3002 | Registra a tentativa de notificação de um pedido criado. Não conhece estoque nem regras de pedido. |

Os dados ficam em memória (reiniciar o serviço zera os dados).

## 2. Arquitetura

```
                  reserva estoque (crítica)
            ┌──────────────────────────────► CATÁLOGO / ESTOQUE :3001
 Thunder /  │
 Cliente ──►│ PEDIDOS :3000
 POST /pedidos
            │
            └──────────────────────────────► NOTIFICAÇÕES :3002
                  envia aviso (secundária)
```

- **Dependência crítica (Catálogo):** sem reserva, o pedido **não** é criado.
- **Dependência secundária (Notificações):** se falhar, o pedido **permanece criado** e `notificacaoStatus` fica `"pendente"`.
- **Orquestração:** o `POST /pedidos` coordena o fluxo: validar body → reservar estoque → criar pedido → notificar → responder.
- **Timeout:** toda chamada entre serviços usa `AbortController` (padrão 3000 ms, configurável por `TIMEOUT_MS`).
- **Correlation ID:** o header `x-correlation-id` é gerado no início do `POST /pedidos` (ou reaproveitado, se vier no request) e repassado a Catálogo e Notificações. Aparece nos logs dos três serviços.

## 3. Como rodar

Requisitos: Node.js 18+ (usa `fetch` nativo).

Em **cada** serviço (`catalogo-service`, `notificacoes-service`, `pedidos-service`):

```bash
cd <servico>
cp .env.example .env      # Windows: copy .env.example .env
npm install
npm run dev
```

Ordem sugerida de inicialização: **Catálogo (3001) → Notificações (3002) → Pedidos (3000)**.

### Variáveis de ambiente

```env
# catalogo-service/.env
PORT=3001
SIMULATE_DELAY_MS=0        # opcional: atraso artificial para testar 504

# notificacoes-service/.env
PORT=3002

# pedidos-service/.env
PORT=3000
CATALOG_URL=http://localhost:3001
NOTIFICATION_URL=http://localhost:3002
TIMEOUT_MS=3000
```

O `.env` real **não** é versionado; apenas o `.env.example`.

## 4. Contratos

### Formato padrão de erro (todos os serviços)

```json
{ "mensagem": "Estoque insuficiente", "codigo": "ESTOQUE_INSUFICIENTE" }
```

| Status | Quando | Exemplo de mensagem |
|---|---|---|
| 400 | body inválido / quantidade <= 0 | "Dados do pedido são inválidos" |
| 404 | produto ou pedido não existe | "Produto não encontrado" |
| 409 | estoque insuficiente | "Estoque insuficiente" |
| 502 | serviço dependente falhou | "Catálogo indisponível" |
| 504 | serviço dependente excedeu o timeout | "Catálogo demorou para responder" |

### Catálogo/Estoque (:3001)

| Método | Endpoint | Resposta |
|---|---|---|
| GET | `/produtos` | 200 + lista |
| GET | `/produtos/:id` | 200 + produto \| 404 |
| POST | `/produtos` | 201 \| 400 |
| POST | `/produtos/:id/reservas` | 200 \| 400 \| 404 \| 409 |

```http
POST /produtos/1/reservas
{ "quantidade": 2 }

200 OK
{ "reservado": 2, "estoqueRestante": 6, "precoUnitario": 94.95 }
```

> `precoUnitario` é um campo adicional: permite que Pedidos calcule o total com o preço do Catálogo, sem confiar em preço enviado pelo cliente.

Produtos iniciais: `1` Teclado Mecânico (R$ 94,95, estoque 8), `2` Mouse Gamer (R$ 59,90, estoque 15), `3` Monitor 24" (R$ 749,00, estoque 3).

### Pedidos (:3000)

| Método | Endpoint | Resposta |
|---|---|---|
| POST | `/pedidos` | 201 \| 400 \| 404 \| 409 \| 502 \| 504 |
| GET | `/pedidos` | 200 + lista |
| GET | `/pedidos/:id` | 200 \| 404 |

```http
POST /pedidos
{ "produtoId": 1, "quantidade": 2, "clienteEmail": "aluno@estudante.ifms.edu.br" }

201 Created
{
  "id": 1, "produtoId": 1, "quantidade": 2,
  "clienteEmail": "aluno@estudante.ifms.edu.br",
  "total": 189.9, "status": "confirmado",
  "notificacaoStatus": "enviada",
  "criadoEm": "2026-10-29T20:15:00.000Z"
}
```

Tradução de erros do Catálogo para o cliente:

| Situação | Catálogo responde | Pedidos responde |
|---|---|---|
| Produto inexistente | 404 | 404 |
| Quantidade inválida | 400 | 400 |
| Estoque insuficiente | 409 | 409 |
| Catálogo indisponível | falha de rede / 5xx | 502 |
| Catálogo lento | timeout | 504 |

### Notificações (:3002)

| Método | Endpoint | Resposta |
|---|---|---|
| POST | `/notificacoes` | 201 \| 400 |
| GET | `/notificacoes` | 200 + histórico |

```http
POST /notificacoes
{ "pedidoId": 17, "destino": "aluno@estudante.ifms.edu.br", "mensagem": "Pedido 17 confirmado" }
```

## 5. Testes (Thunder Client / curl)

Com os três serviços rodando:

| # | Cenário | Como executar | Esperado |
|---|---|---|---|
| 1 | Pedido válido | `curl -X POST localhost:3000/pedidos -H "Content-Type: application/json" -d '{"produtoId":1,"quantidade":2,"clienteEmail":"aluno@estudante.ifms.edu.br"}'` | 201 + `notificacaoStatus: "enviada"` |
| 2 | Body incompleto | mesmo POST com body `{"produtoId":1}` | 400 |
| 3 | Produto inexistente | `produtoId: 999` | 404 |
| 4 | Sem estoque | `quantidade: 1000` | 409 |
| 5 | Catálogo fora | parar o `catalogo-service` (Ctrl+C) e repetir o pedido válido | 502 |
| 6 | Catálogo lento | reiniciar Catálogo com `SIMULATE_DELAY_MS=5000` (maior que `TIMEOUT_MS`) e repetir o pedido | 504 |
| 7 | Notificação fora | parar o `notificacoes-service` e repetir o pedido válido | 201 + `notificacaoStatus: "pendente"` |
| 8 | Rastreabilidade | pedido válido com `-H "x-correlation-id: teste-123"` | `teste-123` nos logs dos 3 serviços |

Exemplo de log de um único pedido (mesmo `correlationId` nos três terminais):

```
[pedidos-service]      [teste-123] POST http://localhost:3001/produtos/1/reservas -> 200
[catalogo-service]     [teste-123] POST /produtos/1/reservas -> 200
[notificacoes-service] [teste-123] POST /notificacoes -> 201
[pedidos-service]      [teste-123] POST /pedidos -> 201
```

Para o cenário 6 (Windows PowerShell): `$env:SIMULATE_DELAY_MS=5000; npm run dev`. Linux/macOS: `SIMULATE_DELAY_MS=5000 npm run dev`. Alternativa: reduzir `TIMEOUT_MS` no `.env` de Pedidos para `1` e reiniciar.

## 6. Decisões de projeto

- **Dados isolados:** cada serviço guarda seus dados; Pedidos nunca acessa o array do Catálogo, apenas o contrato HTTP.
- **Sem URL hardcoded:** `CATALOG_URL` e `NOTIFICATION_URL` vêm do ambiente; Pedidos não inicia se faltarem.
- **Retry:** não implementado. Reservar estoque é um `POST` não idempotente; repetir cegamente poderia reservar duas vezes.
- **Sem stack trace para o cliente:** todo erro inesperado vira `500` com JSON padrão.

## 7. Checklist de qualidade

- [x] Três serviços iniciam separadamente, em portas diferentes
- [x] Nenhum serviço acessa dados internos de outro
- [x] Pedidos usa `CATALOG_URL` e `NOTIFICATION_URL` do ambiente
- [x] Reserva devolve 409 quando o estoque é insuficiente
- [x] Catálogo fora do ar não produz stack trace (502/504 em JSON)
- [x] Notificação fora do ar não apaga o pedido confirmado
- [x] Timeout nas chamadas externas
- [x] `correlationId` nos logs dos serviços envolvidos
- [x] README documenta arquitetura, contratos e testes
- [x] Repositório sem `node_modules` nem `.env` reais
