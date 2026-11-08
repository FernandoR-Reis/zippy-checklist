const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const source = fs.readFileSync(path.join(__dirname, "..", "src", "components", "alertas", "filtros.ts"), "utf8");
const moduleTest = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: moduleTest.exports, module: moduleTest });
const { filtrarAlertas } = moduleTest.exports;
const defaults = { busca: "", unidadeId: "", setorId: "", estado: "todos" };
const itens = [
  { nome: "Fechamento Salão", unidadeId: "u1", unidadeNome: "Centro", setorId: "s1", setorNome: "Salão", estado: "atrasado", executorNome: "João" },
  { nome: "Abertura Bar", unidadeId: "u2", unidadeNome: "Norte", setorId: "s2", setorNome: "Bar", estado: "em_andamento", executorNome: null },
  { nome: "Limpeza", unidadeId: "u1", unidadeNome: "Centro", setorId: "s3", setorNome: "Bar", estado: "nao_executado" },
  { nome: "Estoque", unidadeId: "u1", unidadeNome: "Centro", setorId: "s1", setorNome: "Salão", estado: "nao_iniciado" },
  { nome: "Inspeção", unidadeId: "u1", unidadeNome: "Centro", setorId: "s1", setorNome: "Salão", estado: "concluido" },
  { nome: "Rotina", unidadeId: "u2", unidadeNome: "Norte", setorId: "s2", setorNome: "Bar", estado: "agendado" },
];
const filter = (changes) => filtrarAlertas(itens, { ...defaults, ...changes });

test("unfiltered alerts preserve all items and their priority order", () => {
  assert.deepEqual(Array.from(filter({})), itens);
});
test("attention includes not started, missed and overdue, but excludes completed and scheduled", () => {
  assert.deepEqual(Array.from(filter({ estado: "atencao" }), item => item.estado), ["atrasado", "nao_executado", "nao_iniciado"]);
});
test("all individual status filters work", () => {
  for (const item of itens) assert.equal(filter({ estado: item.estado })[0], item);
});
test("combines unit, sector, status and accent-insensitive search", () => {
  assert.equal(filter({ unidadeId: "u1", setorId: "s1", estado: "atrasado", busca: " JOAO " })[0], itens[0]);
  assert.equal(filter({ busca: "salao" }).length, 3);
  assert.equal(filter({ busca: "norte" }).length, 2);
  assert.equal(filter({ setorId: "s3" })[0], itens[2]);
});
test("sectors with the same name are filtered by ID, not name", () => {
  assert.equal(filter({ setorId: "s2" }).length, 2);
  assert.equal(filter({ unidadeId: "u1", setorId: "s2" }).length, 0);
});
test("empty results and historical records use the same filter rules", () => {
  assert.equal(filter({ busca: "inexistente" }).length, 0);
  assert.equal(filtrarAlertas([], defaults).length, 0);
  const historico = [{ ...itens[0], data: "2026-11-07", tipo: "atrasado" }];
  assert.equal(filtrarAlertas(historico, { ...defaults, estado: "atencao" }).length, 1);
  assert.equal(filtrarAlertas(historico, { ...defaults, estado: "nao_executado" }).length, 0);
});
