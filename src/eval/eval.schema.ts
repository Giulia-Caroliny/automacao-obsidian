import { z } from 'zod';
import { KnowledgeOriginEnum, SubGraphNeighbor } from '../schemas/note.schema';

export const JudgeVerdictSchema = z.object({
  faithfulness_score: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'Nota de 0.0 a 1.0 indicando se o Markdown gerado é fiel ao texto bruto original, sem inventar informações falsas.'
    ),
  concept_coverage_score: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'Nota de 0.0 a 1.0 indicando a proporção dos fatos essenciais (keyFacts) que foram devidamente explicados no Markdown gerado.'
    ),
  concept_atomicity_score: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'Nota de 0.0 a 1.0 avaliando se os novos_conceitos sugeridos são termos técnicos atômicos e reutilizáveis no grafo do Obsidian (penalize termos vagos como [[Estudo]], [[Aula]], [[Resumo]]).'
    ),
  critique: z
    .string()
    .describe(
      'Justificativa técnica concisa (1 a 2 frases) explicando as notas atribuídas.'
    ),
});

export type JudgeVerdict = z.infer<typeof JudgeVerdictSchema>;

export interface GoldenTestCase {
  id: string;
  sourceFileName: string;
  rawText: string;
  mockedNeighbors: SubGraphNeighbor[];
  expectedOrigin: z.infer<typeof KnowledgeOriginEnum>;
  expectedExistingLinks: string[];
  keyFacts: string[];
}

export interface DeterministicMetrics {
  originCorrect: boolean;
  linkGroundedness: number; // % dos links_existentes que realmente existem no sub-grafo do LanceDB
  linkPrecision: number;    // % dos links_existentes que batem com o gabarito esperado
  linkRecall: number;       // % do gabarito esperado que foi recuperado pelo agente
}

export interface CaseEvaluationResult {
  caseId: string;
  predictedOrigin: string;
  expectedOrigin: string;
  deterministic: DeterministicMetrics;
  judge: JudgeVerdict;
  latencyMs: number;
}