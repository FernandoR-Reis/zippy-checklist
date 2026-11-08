const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function load(relativePath, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    console,
    require(name) {
      if (name in dependencies) return dependencies[name];
      if (name === "react" || name === "react/jsx-runtime") return require(name);
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return module.exports;
}

const rules = load("src\\lib\\execucoes\\tarefas.ts");
const justified = {
  id: "tarefa",
  titulo: "Limpar bancada",
  tipo: "checkbox",
  obrigatoria: true,
  concluida: false,
  observacao: "Produto de limpeza indisponível.",
  resposta: null,
};

function setup(results, { authorized = true, matchingChecklist = true } = {}) {
  const calls = [];
  const invalidated = [];
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
      for (const method of ["select", "eq", "update", "maybeSingle"]) {
        query[method] = (...args) => {
          operations.push({ method, args });
          return query;
        };
      }
      return query;
    },
  };
  const actions = load("src\\lib\\execucoes\\actions.ts", {
    "next/navigation": {
      redirect: (url) => { throw Object.assign(new Error("redirect"), { url }); },
    },
    "next/cache": { revalidatePath: (url) => invalidated.push(url) },
    "@/lib/supabase/server": { createClient: () => client },
    "@/lib/empresas/agenda": { buscarAgendaEmpresa: async () => ({}) },
    "@/lib/usuarios/actions": {},
    "@/lib/unidades/guard": {},
    "@/lib/execucoes/guard": {
      execucaoComContexto: async () => ({
        podeEditar: authorized,
        usuario: { id: "usuario", empresa_id: "empresa" },
        checklist: { id: matchingChecklist ? "checklist" : "outro", horario: "16:00" },
        execucao: { data: "2026-11-08" },
      }),
    },
    "@/lib/execucoes/schedule": {
      janelaChecklist: () => ({ prazoFinal: new Date(Date.now() + 60000) }),
    },
    "@/lib/execucoes/tarefas": rules,
  });
  return { actions, calls, invalidated, results };
}

async function finalize(setup) {
  let url;
  await assert.rejects(
    setup.actions.finalizarExecucao("checklist", "execucao", new FormData()),
    error => { url = error.url; return Boolean(url); },
  );
  assert.equal(setup.results.length, 0);
  return url;
}

test("a justified non-executed task is resolved, but never counted as completed", () => {
  assert.equal(rules.tarefaNaoFeita(justified), true);
  assert.equal(rules.tarefaResolvida(justified), true);
  assert.equal(justified.concluida, false);
  for (const observacao of [null, "", " \n\t "]) {
    assert.equal(rules.tarefaNaoFeita({ ...justified, observacao }), false);
    assert.equal(rules.tarefaResolvida({ ...justified, observacao }), false);
  }
  assert.equal(rules.tarefaNaoFeita({ ...justified, concluida: true }), false);
  assert.equal(rules.tarefaResolvida({ ...justified, concluida: true }), true);
});

test("finalizes mandatory tasks marked non-executed with a stored observation", async () => {
  const state = setup([
    { data: [justified] },
    { data: { id: "execucao" } },
  ]);
  assert.equal(await finalize(state), "/hoje");
  assert.ok(state.calls[0].operations.some(op =>
    op.method === "select" && op.args[0].includes("observacao")));
  const update = state.calls[1].operations.find(op => op.method === "update").args[0];
  assert.equal(update.status, "concluido");
  assert.ok(update.fim);
  assert.equal(state.calls[1].table, "execucoes");
  assert.deepEqual(state.invalidated, ["/hoje/checklist", "/hoje"]);
});

test("rejects mandatory tasks with missing or whitespace-only observations", async () => {
  for (const observacao of [null, "", " \n\t "]) {
    const state = setup([{ data: [{ ...justified, observacao }] }]);
    const url = await finalize(state);
    assert.match(decodeURIComponent(url), /marque como não feitas com uma observação/);
    assert.equal(state.calls.length, 1);
    assert.equal(state.invalidated.length, 0);
  }
});

test("preserves completion of done tasks and optional unanswered tasks", async () => {
  const state = setup([
    { data: [
      { ...justified, concluida: true, observacao: null },
      { ...justified, obrigatoria: false, observacao: null },
    ] },
    { data: { id: "execucao" } },
  ]);
  assert.equal(await finalize(state), "/hoje");
});

test("does not bypass authorization or checklist ownership", async () => {
  for (const options of [{ authorized: false }, { matchingChecklist: false }]) {
    const state = setup([], options);
    assert.equal(await finalize(state), "/hoje/checklist");
    assert.equal(state.calls.length, 0);
  }
});

test("reports task-read or finalization failures instead of claiming success", async () => {
  for (const results of [
    [{ data: null, error: { message: "Read failed" } }],
    [{ data: [justified] }, { data: null, error: { message: "Update failed" } }],
    [{ data: [justified] }, { data: null }],
  ]) {
    const state = setup(results);
    assert.match(await finalize(state), /\/hoje\/checklist\?erro=/);
    assert.equal(state.invalidated.length, 0);
  }
});

test("non-executed registration rejects missing and whitespace-only observations", async () => {
  for (const observacao of ["", " \n\t "]) {
    const state = setup([]);
    const form = new FormData();
    form.set("observacao", observacao);
    const result = await state.actions.registrarTarefaNaoFeita("checklist", "execucao", "tarefa", form);
    assert.equal(result.sucesso, false);
    assert.match(result.erro, /Informe por que/);
    assert.equal(state.calls.length, 0);
  }
});

test("non-executed registration saves the trimmed reason and clears previous answers", async () => {
  const state = setup([{ data: { id: "tarefa" } }]);
  const form = new FormData();
  form.set("observacao", `  ${justified.observacao}  `);
  const result = await state.actions.registrarTarefaNaoFeita("checklist", "execucao", "tarefa", form);
  assert.equal(result.sucesso, true);
  const update = state.calls[0].operations.find(op => op.method === "update").args[0];
  assert.deepEqual(JSON.parse(JSON.stringify(update)), {
    observacao: justified.observacao,
    concluida: false,
    concluida_em: null,
    resposta: null,
    evidencia: null,
  });
});

const uiDependencies = {
  "@/lib/execucoes/tarefas": rules,
  "@/components/ui/Button": {
    Button: ({ children, loadingText, variant, ...props }) => React.createElement("button", props, children),
  },
  "@/components/ui/CheckMark": { CheckMark: () => React.createElement("span") },
};
const { ExecutionTasks } = load("src\\components\\hoje\\ExecutionTasks.tsx", {
  ...uiDependencies,
  "@/lib/execucoes/actions": {
    finalizarExecucao: async () => {},
  },
});

function renderTasks(tarefas, podeEditar = true) {
  return renderToStaticMarkup(React.createElement(ExecutionTasks, {
    checklistId: "checklist", execucaoId: "execucao", tarefas, podeEditar,
  }));
}

test("the review resumes after justified tasks and enables finalization with a visible warning", () => {
  const html = renderTasks([justified]);
  assert.match(html, /existe 1 tarefa que não foi executada/);
  assert.match(html, /Limpar bancada/);
  assert.match(html, /Produto de limpeza indisponível/);
  assert.match(html, /Finalizar checklist/);
  assert.doesNotMatch(html, /Todas as tarefas foram concluídas/);
  assert.match(html, /0 de 1 tarefas concluídas/);
});

test("read-only review cannot finalize even with justified mandatory tasks", () => {
  assert.doesNotMatch(renderTasks([justified], false), /Finalizar checklist/);
});

test("mandatory unaddressed tasks still require a non-empty observation", () => {
  const html = renderTasks([{ ...justified, observacao: null }]);
  assert.doesNotMatch(html, /Finalizar checklist/);
  assert.match(html, /Tarefa 1 de 1/);
});

test("all-done review keeps the success state without a non-execution warning", () => {
  const html = renderTasks([{ ...justified, concluida: true, observacao: null }]);
  assert.match(html, /Todas as tarefas foram concluídas/);
  assert.match(html, /Finalizar checklist/);
  assert.doesNotMatch(html, /tarefa que não foi executada/);
});

test("review warns about every justified task while keeping unaddressed optional tasks optional", () => {
  const html = renderTasks([
    justified,
    { ...justified, id: "segunda", titulo: "Limpar piso", obrigatoria: false },
    { ...justified, id: "opcional", obrigatoria: false, observacao: null },
  ]);
  assert.match(html, /existem 2 tarefas que não foram executadas/);
  // Navigate to the unanswered optional task on resume; justified tasks are not repeated.
  assert.match(html, /Tarefa 3 de 3/);
});

test("completed checklist shows the non-executed task and its saved reason", async () => {
  const { default: Page } = load("src\\app\\(app)\\hoje\\[checklistId]\\page.tsx", {
    ...uiDependencies,
    "@/lib/execucoes/actions": {
      buscarExecucaoDoDia: async () => ({
        checklist: { nome: "Fechamento" },
        execucao: { status: "concluido" },
        tarefas: [justified],
        agenda: { fuso_horario: "America/Sao_Paulo" },
      }),
    },
    "next/navigation": {},
    "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
    "@/components/hoje/ExecutionTasks": { ExecutionTasks },
    "@/components/ui/Card": { Card: ({ children }) => React.createElement("div", null, children) },
    "@/components/ui/Badge": {},
    "@/lib/execucoes/schedule": {},
  });
  const html = renderToStaticMarkup(await Page({ params: { checklistId: "checklist" }, searchParams: {} }));
  assert.match(html, /Checklist concluído/);
  assert.match(html, /0\/1 tarefas concluídas/);
  assert.match(html, /existe 1 tarefa que não foi executada/);
  assert.match(html, /Produto de limpeza indisponível/);
});

test("today list distinguishes completion from tasks not executed", async () => {
  const { default: Page } = load("src\\app\\(app)\\hoje\\page.tsx", {
    ...uiDependencies,
    "@/lib/usuarios/actions": { getOrCreateUsuarioAtual: async () => ({ nome: "Teste", empresa_id: "empresa" }) },
    "@/lib/empresas/agenda": {
      buscarAgendaEmpresa: async () => ({
        inicio_operacao: "16:00", fim_operacao: "00:30", fuso_horario: "America/Sao_Paulo",
      }),
    },
    "@/lib/execucoes/actions": {
      listarChecklistsDoDia: async () => [{
        checklist: { id: "checklist", nome: "Fechamento", ativo: true, horario: "23:00" },
        setorNome: "Salão",
        totalTarefas: 2,
        concluidas: 1,
        naoFeitas: 1,
        execucao: { status: "concluido", usuario_id: null },
      }],
    },
    "@/lib/execucoes/schedule": {
      dataOperacional: () => "2026-11-08",
      janelaChecklist: () => null,
      horarioNoDiaSeguinte: () => false,
    },
    "@/components/ui/Card": { Card: ({ children }) => React.createElement("div", null, children) },
    "@/components/ui/Badge": { Badge: ({ children }) => React.createElement("span", null, children) },
    "@/components/ui/EmptyState": {},
  });
  const html = renderToStaticMarkup(await Page({ searchParams: {} }));
  assert.match(html, /Concluído/);
  assert.match(html, /1\/2 concluídas/);
  assert.match(html, /existe 1 tarefa que não foi executada/);
  assert.match(html, /Observações registradas/);
});
