const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "lib", "checklists", "actions.ts"), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

const original = {
  setor_id: "setor",
  responsavel_id: "responsavel",
  nome: "Abertura",
  descricao: "Rotina",
  recorrencia: "diaria",
  horario: "08:00:00",
};
const tarefa = { titulo: "Limpar", tipo: "checkbox", obrigatoria: true, ordem: 3 };

function setup(results, authorized = true) {
  const calls = [];
  const invalidated = [];
  const errors = [];
  const module = { exports: {} };
  const client = {
    from(table) {
      const operations = [];
      calls.push({ table, operations });
      const query = {
        then(resolve, reject) {
          assert.ok(results.length, "Unexpected database query");
          return Promise.resolve(results.shift()).then(resolve, reject);
        },
      };
      for (const method of ["select", "eq", "order", "insert", "delete", "single", "maybeSingle"]) {
        query[method] = (...args) => {
          operations.push({ method, args });
          return query;
        };
      }
      return query;
    },
  };
  vm.runInNewContext(code, {
    exports: module.exports,
    module,
    console: { error: (...args) => errors.push(args) },
    require(name) {
      if (name === "next/navigation") return { redirect: (url) => { throw Object.assign(new Error("redirect"), { url }); } };
      if (name === "next/cache") return { revalidatePath: (url) => invalidated.push(url) };
      if (name === "@/lib/supabase/server") return { createClient: () => client };
      if (name === "@/lib/unidades/guard") return { unidadeDoUsuario: async () => authorized ? {} : null };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return {
    calls, invalidated, errors,
    async run(action = "duplicarChecklist", formData = new FormData()) {
      await assert.rejects(
        module.exports[action]("unidade", "origem", formData),
        (error) => { this.url = error.url; return Boolean(error.url); },
      );
      assert.equal(results.length, 0);
      return this;
    },
  };
}

test("duplicates checklist fields and ordered tasks, then redirects to the copy", async () => {
  const result = await setup([
    { data: original }, { data: [tarefa] }, { data: { id: "copia" } }, { error: null },
  ]).run();
  assert.equal(result.url, "/unidades/unidade/checklists/copia?duplicado=1");
  const fields = result.calls[2].operations.find((op) => op.method === "insert").args[0];
  assert.equal(fields.nome, "Abertura - Cópia");
  assert.equal(fields.responsavel_id, original.responsavel_id);
  assert.equal(fields.horario, original.horario);
  const tasks = result.calls[3].operations.find((op) => op.method === "insert").args[0];
  assert.deepEqual(JSON.parse(JSON.stringify(tasks)), [{ checklist_template_id: "copia", ...tarefa }]);
  assert.deepEqual(result.invalidated, ["/unidades/unidade/checklists", "/hoje"]);
});

test("duplicates an empty checklist without inserting tasks", async () => {
  const result = await setup([{ data: original }, { data: [] }, { data: { id: "copia" } }]).run();
  assert.match(result.url, /duplicado=1$/);
  assert.equal(result.calls.length, 3);
});

test("denies unauthorized duplication without touching the database", async () => {
  const result = await setup([], false).run();
  assert.match(result.url, /erroDuplicacao=/);
  assert.equal(result.calls.length, 0);
});

test("does not create a copy when reading tasks fails", async () => {
  const result = await setup([{ data: original }, { error: { message: "read failed" } }]).run();
  assert.match(result.url, /origem\?erroDuplicacao=/);
  assert.equal(result.calls.length, 2);
  assert.equal(result.errors.length, 1);
});

test("reports database insert failure instead of silently returning", async () => {
  const result = await setup([
    { data: original }, { data: [] }, { data: null, error: { message: "RLS denied" } },
  ]).run();
  assert.match(result.url, /origem\?erroDuplicacao=/);
  assert.equal(result.errors.length, 1);
});

test("removes an incomplete copy when inserting tasks fails", async () => {
  const result = await setup([
    { data: original }, { data: [tarefa] }, { data: { id: "copia" } },
    { error: { message: "task insert failed" } }, { data: { id: "copia" } },
  ]).run();
  assert.match(result.url, /origem\?erroDuplicacao=/);
  assert.ok(result.calls[4].operations.some((op) => op.method === "delete"));
  assert.equal(result.invalidated.length, 0);
});

test("reports an incomplete copy when cleanup is denied or removes no rows", async () => {
  for (const cleanup of [{ error: { message: "delete denied" } }, { data: null }]) {
    const result = await setup([
      { data: original }, { data: [tarefa] }, { data: { id: "copia" } },
      { error: { message: "task insert failed" } }, cleanup,
    ]).run();
    assert.match(result.url, /copia\?erroDuplicacao=/);
    assert.equal(result.errors.length, 2);
    assert.deepEqual(result.invalidated, ["/unidades/unidade/checklists"]);
  }
});

function confirmation() {
  const form = new FormData();
  form.set("confirmar", "excluir");
  return form;
}

test("deletion requires management permission and explicit confirmation", async () => {
  for (const [authorized, form] of [[false, confirmation()], [true, new FormData()]]) {
    const result = await setup([], authorized).run("excluirChecklist", form);
    assert.match(result.url, /checklists\?erro=/);
    assert.equal(result.calls.length, 0);
  }
});

test("deletes only the checklist in the authorized unit and invalidates affected pages", async () => {
  const result = await setup([{ data: { id: "origem" } }]).run("excluirChecklist", confirmation());
  assert.equal(result.url, "/unidades/unidade/checklists?excluido=1");
  const operations = result.calls[0].operations;
  assert.ok(operations.some(op => op.method === "delete"));
  const filters = operations.filter(op => op.method === "eq").map(op => op.args);
  assert.deepEqual(JSON.parse(JSON.stringify(filters)), [["id", "origem"], ["unidade_id", "unidade"]]);
  assert.deepEqual(result.invalidated, [
    "/unidades/unidade/checklists",
    "/unidades/unidade/checklists/origem",
    "/hoje",
  ]);
});

test("deletion reports database errors and missing or inaccessible checklists", async () => {
  for (const response of [{ error: { message: "RLS denied" } }, { data: null }]) {
    const result = await setup([response]).run("excluirChecklist", confirmation());
    assert.match(result.url, /checklists\?erro=/);
    assert.equal(result.errors.length, 1);
    assert.equal(result.invalidated.length, 0);
  }
});
