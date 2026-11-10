import fg from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { VaultNoteMetadata } from '../schemas/note.schema';

export class VaultIndexer {
  constructor(private vaultPath: string) {}

  async getGraphCatalog(): Promise<VaultNoteMetadata[]> {
    const markdownFiles = await fg('**/*.md', {
      cwd: this.vaultPath,
      ignore: ['.obsidian/**', '.trash/**', 'templates/**'],
      absolute: true,
    });

    const catalog: VaultNoteMetadata[] = [];

    for (const filePath of markdownFiles) {
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const { data } = matter(fileContent);
        const fileName = path.basename(filePath, '.md');

        catalog.push({
          titulo: data.titulo || fileName,
          origem: data.origem || 'Desconhecida',
          tags: Array.isArray(data.tags) ? data.tags : [],
          resumo: data.resumo || undefined,
        });
      } catch (error) {
        console.warn(`[VaultIndexer] Falha ao ler metadados de ${filePath}:`, error);
      }
    }

    return catalog;
  }
}