import fs from 'fs/promises';
import path from 'path';
import goldenDataset from './golden-dataset.json';
import { KnowledgeGraphAgent } from '../services/llm-agent';
import { MetricsCalculator } from './metrics.calculator';
import { LLMJudge } from './llm-judge';
import { CaseEvaluationResult, GoldenTestCase } from './eval.schema';

async function runBenchmark() {
  const datasetPath = path.join(__dirname, 'golden-dataset.json');
  const rawDataset = await fs.readFile(datasetPath, 'utf-8');
  const testCases: GoldenTestCase[] = JSON.parse(rawDataset);

  const agent = new KnowledgeGraphAgent();
  const judge = new LLMJudge();
  const results: CaseEvaluationResult[] = [];

  console.log(`=============================================================`);
  console.log(` Iniciando Benchmark do Obsidian GraphRAG Agent (${testCases.length} casos)`);
  console.log(`=============================================================\n`);

  for (const testCase of testCases) {
    console.log(`-> Avaliando caso [${testCase.id}] (${testCase.sourceFileName})...`);
    const startTime = Date.now();

    const generatedNote = await agent.processRawNote(
      testCase.rawText,
      testCase.sourceFileName,
      testCase.mockedNeighbors
    );
    const latencyMs = Date.now() - startTime;

    const deterministic = MetricsCalculator.evaluate(testCase, generatedNote);
    const judgeVerdict = await judge.evaluateNote(testCase, generatedNote);

    results.push({
      caseId: testCase.id,
      predictedOrigin: generatedNote.origem,
      expectedOrigin: testCase.expectedOrigin,
      deterministic,
      judge: judgeVerdict,
      latencyMs,
    });

    console.log(
      `   [OK] Groundedness: ${(deterministic.linkGroundedness * 100).toFixed(0)}% | Faithfulness: ${(judgeVerdict.faithfulness_score * 100).toFixed(0)}% | Coverage: ${(judgeVerdict.concept_coverage_score * 100).toFixed(0)}% (${latencyMs}ms)\n`
    );
  }

  // Cálculo das médias globais
  const avg = (arr: number[]) =>
    arr.reduce((acc, val) => acc + val, 0) / (arr.length || 1);

  const originAccuracy = avg(
    results.map((r) => (r.deterministic.originCorrect ? 1 : 0))
  );
  const avgGroundedness = avg(
    results.map((r) => r.deterministic.linkGroundedness)
  );
  const avgPrecision = avg(results.map((r) => r.deterministic.linkPrecision));
  const avgRecall = avg(results.map((r) => r.deterministic.linkRecall));
  const avgFaithfulness = avg(
    results.map((r) => r.judge.faithfulness_score)
  );
  const avgCoverage = avg(
    results.map((r) => r.judge.concept_coverage_score)
  );
  const avgAtomicity = avg(
    results.map((r) => r.judge.concept_atomicity_score)
  );
  const avgLatency = Math.round(avg(results.map((r) => r.latencyMs)));

  const pct = (val: number) => `${(val * 100).toFixed(1)}%`;

  // Geração do relatório em Markdown para o GitHub README
  const markdownReport = `## 📊 Avaliação Quantitativa do Pipeline (GraphRAG Eval)

    Relatório gerado automaticamente pelo módulo \`src/eval/run-eval.ts\` combinando **métricas determinísticas de grafo** e **LLM-as-a-Judge**:

    ### Resumo Global de Performance

    | Métrica | Tipo de Avaliação | Resultado Médio | Meta de Produção |
    | :--- | :--- | :---: | :---: |
    | **Origin Classification Accuracy** | Determinístico (Exact Match) | **${pct(originAccuracy)}** | >= 95.0% |
    | **Sub-Graph Link Groundedness** | Determinístico (Anti-Alucinação de Nós) | **${pct(avgGroundedness)}** | >= 95.0% |
    | **Link Discovery Precision** | Determinístico (Gabarito Top-K) | **${pct(avgPrecision)}** | >= 80.0% |
    | **Link Discovery Recall** | Determinístico (Gabarito Top-K) | **${pct(avgRecall)}** | >= 80.0% |
    | **Faithfulness (Fidelidade Factual)** | LLM-as-a-Judge (0.0 - 1.0) | **${pct(avgFaithfulness)}** | >= 90.0% |
    | **Concept Coverage (Retenção)** | LLM-as-a-Judge (0.0 - 1.0) | **${pct(avgCoverage)}** | >= 90.0% |
    | **New Concept Atomicity** | LLM-as-a-Judge (Qualidade do Grafo) | **${pct(avgAtomicity)}** | >= 85.0% |
    | **Latência Média por Nota** | Telemetria de Sistema | **${avgLatency} ms** | <= 5000 ms |

    ### Detalhamento por Caso de Teste (Golden Dataset)

    | Caso | Origem Prevista | Groundedness | Link Recall | Faithfulness | Coverage | Crítica do Juiz |
    | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
    ${results
    .map(
        (r) =>
        `| \`${r.caseId}\` | \`${r.predictedOrigin}\` ${r.deterministic.originCorrect ? '✅' : '❌'} | ${pct(r.deterministic.linkGroundedness)} | ${pct(r.deterministic.linkRecall)} | ${pct(r.judge.faithfulness_score)} | ${pct(r.judge.concept_coverage_score)} | ${r.judge.critique} |`
    )
    .join('\n')}
  `;

  const reportOutputPath = '/app/data/vault/EVAL_REPORT.md';
  await fs.writeFile(reportOutputPath, markdownReport, 'utf-8');

  const reportOutputPath_2 = path.resolve(process.cwd(), 'EVAL_REPORT.md');
  await fs.writeFile(reportOutputPath_2, markdownReport, 'utf-8');

  console.log(`=============================================================`);
  console.log(` Relatório salvo com sucesso em: ${reportOutputPath}`);
  console.log(` Copie o conteúdo de EVAL_REPORT.md para o seu README.md!`);
  console.log(`=============================================================`);
}

runBenchmark().catch((err) => {
  console.error('[Erro Fatal no Benchmark]:', err);
  process.exit(1);
});