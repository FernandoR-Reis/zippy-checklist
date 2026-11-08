const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(
  path.join(__dirname, "..", "src", "lib", "execucoes", "schedule.ts"),
  "utf8",
);
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const testModule = { exports: {} };
vm.runInNewContext(code, { exports: testModule.exports, module: testModule });

test("uses the Sao Paulo date across UTC midnight", () => {
  assert.equal(
    testModule.exports.dataOperacional(new Date("2026-11-05T02:59:00.000Z")),
    "2026-11-04",
  );
  assert.equal(
    testModule.exports.dataOperacional(new Date("2026-11-05T03:01:00.000Z")),
    "2026-11-05",
  );
});

test("calculates a 90-minute window from the scheduled local start", () => {
  const window = testModule.exports.janelaChecklist(
    "2026-11-04",
    "16:00:00",
    90,
  );

  assert.equal(window.inicio.toISOString(), "2026-11-04T19:00:00.000Z");
  assert.equal(window.prazoFinal.toISOString(), "2026-11-04T20:30:00.000Z");
  assert.equal(testModule.exports.formatarHoraOperacional(window.prazoFinal), "17:30");
});

test("keeps checklists after midnight in the operation's start date", () => {
  const agenda = {
    fuso_horario: "America/Sao_Paulo",
    inicio_operacao: "16:00:00",
    fim_operacao: "00:30:00",
  };
  const scheduled = testModule.exports.janelaChecklist(
    "2026-11-04",
    "00:15:00",
    90,
    agenda,
  );

  assert.equal(scheduled.inicio.toISOString(), "2026-11-05T03:15:00.000Z");
  assert.equal(scheduled.prazoFinal.toISOString(), "2026-11-05T04:45:00.000Z");
  assert.equal(
    testModule.exports.dataOperacional(
      new Date("2026-11-05T04:30:00.000Z"),
      agenda,
      "00:15:00",
      90,
    ),
    "2026-11-04",
  );
  assert.equal(
    testModule.exports.dataOperacional(
      new Date("2026-11-05T03:15:00.000Z"),
      agenda,
      "16:00",
      90,
    ),
    "2026-11-05",
  );
  assert.equal(
    testModule.exports.dataOperacional(
      new Date("2026-11-05T19:00:00.000Z"),
      agenda,
      "00:15:00",
      90,
    ),
    "2026-11-05",
  );
  assert.equal(
    testModule.exports.dataOperacional(
      new Date("2026-11-05T19:00:00.000Z"),
      agenda,
      "00:15:00",
      1440,
    ),
    "2026-11-04",
  );
});

test("warns when a checklist deadline extends beyond the operation", () => {
  const agenda = {
    fuso_horario: "America/Sao_Paulo",
    inicio_operacao: "16:00",
    fim_operacao: "00:30",
  };

  assert.deepEqual(
    JSON.parse(JSON.stringify(
      testModule.exports.analisarPrazoOperacional("23:45", 90, agenda),
    )),
    {
      foraDaOperacao: false,
      terminaDepoisDoFim: true,
      horarioTermino: "01:15",
      terminoNoDiaSeguinte: true,
    },
  );
  assert.equal(
    testModule.exports.horarioNoDiaSeguinte("00:15", agenda),
    true,
  );
  assert.equal(
    testModule.exports.horarioDentroDaOperacao("10:00", agenda),
    false,
  );
});

test("uses the company's timezone for schedule dates", () => {
  const agenda = {
    fuso_horario: "America/Manaus",
    inicio_operacao: "16:00",
    fim_operacao: "00:30",
  };
  const window = testModule.exports.janelaChecklist(
    "2026-11-04",
    "00:15",
    90,
    agenda,
  );

  assert.equal(window.inicio.toISOString(), "2026-11-05T04:15:00.000Z");
  assert.equal(
    testModule.exports.dataOperacional(
      new Date("2026-11-05T05:00:00.000Z"),
      agenda,
      "00:15",
      90,
    ),
    "2026-11-04",
  );
});

test("rejects missing schedules and invalid durations", () => {
  assert.equal(testModule.exports.janelaChecklist("2026-11-04", null, 90), null);
  assert.equal(testModule.exports.janelaChecklist("2026-11-04", "16:00", 0), null);
  assert.equal(testModule.exports.janelaChecklist("invalid", "16:00", 90), null);
});
