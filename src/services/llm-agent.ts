import { GoogleGenAI } from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { env } from '../config/env';
import {
  ProcessedNote,
  ProcessedNoteSchema,
  SubGraphNeighbor,
} from '../schemas/note.schema';

export class KnowledgeGraphAgent {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }

  async processRawNote(
    rawText: string,
    sourceFileName: string,
    nearestNeighbors: SubGraphNeighbor[]
  ): Promise<ProcessedNote> {
    const jsonSchema = zodToJsonSchema(ProcessedNoteSchema as any, 'ProcessedNoteSchema');
    const schemaDefinition =
      jsonSchema.definitions?.ProcessedNoteSchema || jsonSchema;

    const systemPrompt = `
        Você é um Engenheiro do Conhecimento especialista em Obsidian e método Zettelkasten/sistemas GraphRAG.
        Sua missão é ler um rascunho de estudo bruto, identificar sua Origem do Conhecimento, conectá-lo ao grafo existente do Obsidian e reescrevê-lo em Markdown rico e didático.

        REGRAS PARA O GRAFO DO OBSIDIAN:
        1. Separe 'Origem' de 'Assunto': A propriedade 'origem' indica o contexto do estudo (Pos_Graduacao_1_Engenharia_de_IA_Cruzeiro_do_Sul, Pos_Graduacao_2_Engenharia_de_IA_UNIPDS, Certificacao_AWS, Artigo_Externo).
        2. Conecte-se ao Sub-Grafo Recuperado (2-Hop GraphRAG): Abaixo estão as Top-${env.TOP_K_NEIGHBORS} notas semanticamente mais próximas no Vault, incluindo a lista 'relacionados' de cada uma.
            - Se o rascunho tiver relação com o 'titulo' de uma nota vizinha OU com algum Wikilink já listado em 'relacionados', reutilize EXATAMENTE o mesmo nome em 'links_existentes' e insira no 'conteudo_markdown'.
            - Isso evita duplicar nós como [[AWS IAM]] e [[IAM da AWS]].
        3. Crie Novos Conceitos com Parcimônia: Adicione em 'novos_conceitos' de 1 a 3 conceitos técnicos atômicos que ainda não apareceram no sub-grafo.
        4. Formatação Obsidian: No 'conteudo_markdown', use subtítulos (##, ###), listas, tabelas comparativas quando útil e Callouts nativos do Obsidian (ex: > [!tip] Dica de Prova ou > [!warning] Ponto de Atenção). Não inclua o bloco YAML Frontmatter dentro de 'conteudo_markdown', pois ele será injetado via código.
        `.trim();

    const userPrompt = `
    ARQUIVO DE ENTRADA: "${sourceFileName}"

    SUB-GRAFO SEMÂNTICO RECUPERADO DO LANCEDB (Top-${nearestNeighbors.length} notas mais próximas):
    ${JSON.stringify(nearestNeighbors, null, 2)}

    CONTEÚDO BRUTO DA NOTA:
    """
    ${rawText}
    """
    `.trim();

    const response = await this.ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: schemaDefinition as Record<string, unknown>,
        temperature: 0.2,
      },
    });

    if (!response.text) {
      throw new Error('A LLM retornou uma resposta vazia.');
    }

    const parsedJson = JSON.parse(response.text);
    return ProcessedNoteSchema.parse(parsedJson);
  }
}