import { GoogleGenAI } from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { env } from '../config/env';
import { ProcessedNote } from '../schemas/note.schema';
import {
  GoldenTestCase,
  JudgeVerdict,
  JudgeVerdictSchema,
} from './eval.schema';

export class LLMJudge {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }

  async evaluateNote(
    testCase: GoldenTestCase,
    generatedNote: ProcessedNote
  ): Promise<JudgeVerdict> {
    const jsonSchema = zodToJsonSchema(
      JudgeVerdictSchema as any,
      'JudgeVerdictSchema'
    );
    const schemaDefinition =
      (jsonSchema as any).definitions?.JudgeVerdictSchema || jsonSchema;

    const systemPrompt = `
      Você é um Auditor Técnico de IA (LLM-as-a-Judge) avaliando a qualidade de um sistema GraphRAG para o Obsidian.
      Seja rigoroso e objetivo ao atribuir notas entre 0.0 e 1.0 para:
      1. faithfulness_score: O texto gerado em Markdown contém apenas informações sustentadas pelo rascunho bruto ou conhecimentos técnicos diretamente implicados pelos termos, sem alucinar fatos contraditórios?
      2. concept_coverage_score: Todos os 'FATOS ESSENCIAIS ESPERADOS' estão presentes e bem estruturados no Markdown gerado?
      3. concept_atomicity_score: Os 'novos_conceitos' criados pelo agente são conceitos técnicos específicos e excelentes para virarem nós de estudo futuro no grafo do Obsidian?
      `.trim();

    const userPrompt = `
      RASCUNHO BRUTO ORIGINAL:
      """
      ${testCase.rawText}
      """

      FATOS ESSENCIAIS ESPERADOS (KEY FACTS):
      ${JSON.stringify(testCase.keyFacts, null, 2)}

      NOVOS CONCEITOS GERADOS PELO AGENTE:
      ${JSON.stringify(generatedNote.novos_conceitos)}

      MARKDOWN GERADO PELO AGENTE:
      """
      ${generatedNote.conteudo_markdown}
      """
      `.trim();

    const response = await this.ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: schemaDefinition as Record<string, unknown>,
        temperature: 0.0,
      },
    });

    if (!response.text) {
      throw new Error('O LLM-as-a-Judge retornou uma resposta vazia.');
    }

    return JudgeVerdictSchema.parse(JSON.parse(response.text));
  }
}