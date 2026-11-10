import { GoogleGenAI } from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { env } from '../config/env';
import {
  ProcessedNote,
  ProcessedNoteSchema,
} from '../schemas/note.schema';

export class KnowledgeGraphAgent {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }

  async processRawNote(
    rawText: string,
    sourceFileName: string,
//    existingVaultCatalog: VaultNoteMetadata[]
  ): Promise<ProcessedNote> {
    const jsonSchema = zodToJsonSchema(ProcessedNoteSchema as any, 'ProcessedNoteSchema');
    const schemaDefinition =
      jsonSchema.definitions?.ProcessedNoteSchema || jsonSchema;

    const systemPrompt = `
        Você é um Engenheiro do Conhecimento especialista em Obsidian e método Zettelkasten/GraphRAG.
        Sua missão é ler um rascunho de estudo bruto, identificar sua Origem do Conhecimento, conectá-lo ao grafo existente do Obsidian e reescrevê-lo em Markdown rico e didático.

        REGRAS PARA O GRAFO DO OBSIDIAN:
        1. Separe 'Origem' de 'Assunto': A propriedade 'origem' indica o contexto do estudo (Pos_Graduacao_1_Engenharia_de_IA_Cruzeiro_do_Sul, Pos_Graduacao_2_Engenharia_de_IA_UNIPDS, Certificacao_AWS, Artigo_Externo).
        2. Reutilize Nós Existentes: Analise o CATÁLOGO DO VAULT abaixo. Se a nota abordar qualquer tema já presente no catálogo, você DEVE usar o título exato entre colchetes duplos [[Titulo Exato]] tanto no campo 'links_existentes' quanto dentro do 'conteudo_markdown'.
        3. Evite Poluição no Grafo: Crie 'novos_conceitos' apenas para conceitos técnicos/teóricos fundamentais e reutilizáveis (ex: [[Princípio do Menor Privilégio]], [[Normalização 3FN]], [[Arquitetura Serverless]]).
        4. Formatação Obsidian: No 'conteudo_markdown', use subtítulos (##, ###), listas, tabelas comparativas quando útil e Callouts nativos do Obsidian (ex: > [!tip] Dica de Prova ou > [!warning] Ponto de Atenção). Não inclua o bloco YAML Frontmatter dentro de 'conteudo_markdown', pois ele será injetado via código.
        `.trim();

    const userPrompt = `
        ARQUIVO DE ENTRADA: "${sourceFileName}"

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