import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';

export class EmbeddingService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ 
        apiKey: env.GEMINI_API_KEY,
        apiVersion: 'v1beta',
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const cleanText = text.replace(/\s+/g, ' ').trim().slice(0, 8000);

    const response = await this.ai.models.embedContent({
      model: env.EMBEDDING_MODEL,
      contents: cleanText,
    });

    const values = response.embeddings?.[0]?.values;
    if (!values || values.length === 0) {
      throw new Error('Falha ao gerar vetor de embedding na API do Gemini.');
    }

    return values;
  }
}