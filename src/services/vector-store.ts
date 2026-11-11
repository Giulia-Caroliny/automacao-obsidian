import * as lancedb from '@lancedb/lancedb';
import fg from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { EmbeddingService } from './embedding';
import {
  SubGraphNeighbor,
  VectorNoteRecord,
} from '../schemas/note.schema';

export class VaultVectorStore {
  private db!: lancedb.Connection;
  private table: lancedb.Table | null = null;
  private readonly tableName = 'vault_graph_index';

  constructor(
    private dbPath: string,
    private vaultPath: string,
    private embeddingService: EmbeddingService
  ) {}

  async initializeAndSync(): Promise<void> {
    await fs.mkdir(this.dbPath, { recursive: true });
    this.db = await lancedb.connect(this.dbPath);

    const existingTables = await this.db.tableNames();
    if (existingTables.includes(this.tableName)) {
      this.table = await this.db.openTable(this.tableName);
    }

    await this.syncExistingVaultNotes();
  }

  private async syncExistingVaultNotes(): Promise<void> {
    const markdownFiles = await fg('**/*.md', {
      cwd: this.vaultPath,
      ignore: ['.obsidian/**', '.trash/**', 'templates/**'],
      absolute: true,
    });

    if (markdownFiles.length === 0) {
      console.log('[LanceDB] Vault vazio no momento. A tabela será criada na primeira nota.');
      return;
    }

    const indexedIds = new Set<string>();
    if (this.table) {
      const currentRecords = await this.table.query().select(['id']).toArray();
      for (const rec of currentRecords) {
        indexedIds.add(String(rec.id));
      }
    }

    const newRecords: VectorNoteRecord[] = [];

    for (const filePath of markdownFiles) {
      const fileName = path.basename(filePath, '.md');
      if (indexedIds.has(fileName)) continue;

      try {
        const rawFile = await fs.readFile(filePath, 'utf-8');
        const { data, content } = matter(rawFile);

        const titulo = String(data.titulo || fileName);
        const origem = String(data.origem || 'Desconhecida');
        const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
        const relacionados = Array.isArray(data.relacionados)
          ? data.relacionados.map(String)
          : [];
        const resumo = String(
          data.resumo || content.replace(/[#>*_`~-]/g, '').slice(0, 350).trim()
        );

        const textToEmbed = `Título: ${titulo}\nOrigem: ${origem}\nTags: ${tags.join(', ')}\nResumo: ${resumo}\nConteúdo: ${content.slice(0, 1500)}`;
        const vector = await this.embeddingService.generateEmbedding(textToEmbed);

        newRecords.push({
          id: titulo,
          titulo,
          origem,
          tags_json: JSON.stringify(tags),
          relacionados_json: JSON.stringify(relacionados),
          resumo,
          vector,
        });

        console.log(`[LanceDB Sync] Nota indexada: "${titulo}"`);
      } catch (error) {
        console.warn(`[LanceDB Sync] Ignorando ${filePath} devido a erro:`, error);
      }
    }

    if (newRecords.length > 0) {
      if (!this.table) {
        this.table = await this.db.createTable(this.tableName, newRecords);
      } else {
        await this.table.add(newRecords);
      }
      console.log(`[LanceDB Sync] ${newRecords.length} novas notas sincronizadas no índice vetorial.`);
    } else {
      console.log(`[LanceDB Sync] Índice vetorial já está 100% sincronizado (${indexedIds.size} notas).`);
    }
  }

  async searchTopKNeighbors(
    rawText: string,
    topK: number
  ): Promise<SubGraphNeighbor[]> {
    if (!this.table) {
      return [];
    }

    const queryVector = await this.embeddingService.generateEmbedding(rawText);
    const results = await this.table
      .vectorSearch(queryVector)
      .limit(topK)
      .toArray();

    return results.map((row) => ({
      titulo: String(row.titulo),
      origem: String(row.origem),
      tags: JSON.parse(String(row.tags_json || '[]')),
      relacionados: JSON.parse(String(row.relacionados_json || '[]')),
      resumo: String(row.resumo),
      distancia: typeof row._distance === 'number' ? Number(row._distance.toFixed(4)) : undefined,
    }));
  }

  async inspect(limit: number = 5): Promise<void> {
    if (!this.table) {
      console.log('[LanceDB] Tabela não inicializada ou ainda sem dados.');
      return;
    }

    const count = await this.table.countRows();
    console.log(`\n📊 [LanceDB Status] Total de notas indexadas: ${count}`);

    if (count === 0) return;

    const preview = await this.table
      .query()
      .select(['id', 'origem', 'resumo'])
      .limit(limit)
      .toArray();

    console.table(
      preview.map((p) => ({
        ID: p.id,
        Origem: p.origem,
        Resumo: String(p.resumo).slice(0, 50) + '...',
      }))
    );
  }
}