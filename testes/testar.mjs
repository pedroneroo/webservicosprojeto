// Teste automático básico. Rode com os 3 serviços ligados:  node testes/testar.mjs
// (Node 18+, sem dependências)
const PEDIDOS = process.env.PEDIDOS_URL ?? "http://localhost:3000";
const CATALOGO = process.env.CATALOG_URL ?? "http://localhost:3001";
const NOTIF = process.env.NOTIFICATION_URL ?? "http://localhost:3002";

let ok = 0, falhou = 0;

async function chamar(base, metodo, rota, body, headers = {}) {
  const resp = await fetch(base + rota, {
    method: metodo,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await resp.json(); } catch {}
  return { status: resp.status, json, headers: resp.headers };
}

function checar(nome, condicao, detalhe = "") {
  if (condicao) { ok++; console.log(`  PASSOU  ${nome}`); }
  else { falhou++; console.log(`  FALHOU  ${nome} ${detalhe}`); }
}

const email = "aluno@estudante.ifms.edu.br";

console.log("\n== CATÁLOGO (:3001) ==");
let r = await chamar(CATALOGO, "GET", "/produtos");
checar("GET /produtos -> 200 + lista", r.status === 200 && Array.isArray(r.json), `(status ${r.status})`);
r = await chamar(CATALOGO, "GET", "/produtos/1");
checar("GET /produtos/1 -> 200", r.status === 200 && r.json?.id === 1, `(status ${r.status})`);
r = await chamar(CATALOGO, "GET", "/produtos/999");
checar("GET /produtos/999 -> 404", r.status === 404, `(status ${r.status})`);
r = await chamar(CATALOGO, "POST", "/produtos", { nome: "", preco: -1, estoque: "x" });
checar("POST /produtos inválido -> 400", r.status === 400, `(status ${r.status})`);
r = await chamar(CATALOGO, "POST", "/produtos", { nome: "Webcam", preco: 120, estoque: 5 });
checar("POST /produtos válido -> 201", r.status === 201 && r.json?.id, `(status ${r.status})`);
r = await chamar(CATALOGO, "POST", "/produtos/1/reservas", { quantidade: -3 });
checar("Reserva com quantidade inválida -> 400", r.status === 400, `(status ${r.status})`);
r = await chamar(CATALOGO, "POST", "/produtos/999/reservas", { quantidade: 1 });
checar("Reserva de produto inexistente -> 404", r.status === 404, `(status ${r.status})`);
r = await chamar(CATALOGO, "POST", "/produtos/1/reservas", { quantidade: 100000 });
checar("Reserva acima do estoque -> 409", r.status === 409 && r.json?.codigo === "ESTOQUE_INSUFICIENTE", `(status ${r.status})`);

console.log("\n== NOTIFICAÇÕES (:3002) ==");
r = await chamar(NOTIF, "POST", "/notificacoes", { pedidoId: 17, destino: email, mensagem: "Pedido 17 confirmado" });
checar("POST /notificacoes válido -> 201", r.status === 201, `(status ${r.status})`);
r = await chamar(NOTIF, "POST", "/notificacoes", { pedidoId: "abc" });
checar("POST /notificacoes inválido -> 400", r.status === 400, `(status ${r.status})`);
r = await chamar(NOTIF, "GET", "/notificacoes");
checar("GET /notificacoes -> 200 + histórico", r.status === 200 && Array.isArray(r.json), `(status ${r.status})`);

console.log("\n== PEDIDOS (:3000) ==");
r = await chamar(PEDIDOS, "POST", "/pedidos", { produtoId: 1, quantidade: 2, clienteEmail: email });
checar("Pedido válido -> 201", r.status === 201, `(status ${r.status})`);
checar("  total = preço do Catálogo x quantidade", r.json?.total === 189.9, `(total ${r.json?.total})`);
checar("  notificacaoStatus = enviada", r.json?.notificacaoStatus === "enviada", `(${r.json?.notificacaoStatus})`);
const idCriado = r.json?.id;

r = await chamar(PEDIDOS, "POST", "/pedidos", { produtoId: 1 });
checar("Body incompleto -> 400", r.status === 400 && r.json?.codigo === "DADOS_INVALIDOS", `(status ${r.status})`);
r = await chamar(PEDIDOS, "POST", "/pedidos", { produtoId: 1, quantidade: 0, clienteEmail: email });
checar("Quantidade <= 0 -> 400", r.status === 400, `(status ${r.status})`);
r = await chamar(PEDIDOS, "POST", "/pedidos", { produtoId: 999, quantidade: 1, clienteEmail: email });
checar("Produto inexistente -> 404", r.status === 404 && r.json?.codigo === "PRODUTO_NAO_ENCONTRADO", `(status ${r.status})`);
r = await chamar(PEDIDOS, "POST", "/pedidos", { produtoId: 1, quantidade: 100000, clienteEmail: email });
checar("Sem estoque -> 409", r.status === 409 && r.json?.codigo === "ESTOQUE_INSUFICIENTE", `(status ${r.status})`);

r = await chamar(PEDIDOS, "POST", "/pedidos", { produtoId: 2, quantidade: 1, clienteEmail: email }, { "x-correlation-id": "teste-123" });
checar("Correlation ID devolvido no header", r.headers.get("x-correlation-id") === "teste-123");

r = await chamar(PEDIDOS, "GET", "/pedidos");
checar("GET /pedidos -> 200 + lista", r.status === 200 && r.json?.length >= 1, `(status ${r.status})`);
r = await chamar(PEDIDOS, "GET", `/pedidos/${idCriado}`);
checar("GET /pedidos/:id existente -> 200", r.status === 200, `(status ${r.status})`);
r = await chamar(PEDIDOS, "GET", "/pedidos/99999");
checar("GET /pedidos/99999 -> 404", r.status === 404, `(status ${r.status})`);

console.log(`\nResultado: ${ok} passaram, ${falhou} falharam.`);
console.log("Testes manuais restantes (502, 504, notificação pendente): veja TESTES.md");
process.exit(falhou ? 1 : 0);
