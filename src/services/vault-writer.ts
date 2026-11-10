import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { ProcessedNote } from '../schemas/note.schema';

export class VaultWriter {
  constructor(
    private vaultPath: string,
    private processedPath: string
  ) {}

  private sanitizeFileName(title: string): string {
    return title
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async saveToVault(note: ProcessedNote, originalFilePath: string): Promise<string> {
    const safeTitle = this.sanitizeFileName(note.titulo);
    const originFolder = path.join(this.vaultPath, note.origem);

    await fs.mkdir(originFolder, { recursive: true });

    const frontmatterData = {
      titulo: safeTitle,
      origem: note.origem,
      fonte_arquivo: path.basename(originalFilePath),
      data_processamento: new Date().toISOString().split('T')[0],
      moc: note.moc,
      tags: note.tags,
      resumo: note.resumo_executivo,
      relacionados: [
        ...new Set([...note.links_existentes, ...note.novos_conceitos]),
      ],
    };

    const markdownWithFrontmatter = matter.stringify(
      `\n# ${safeTitle}\n\n${note.conteudo_markdown}\n`,
      frontmatterData
    );

    const targetNotePath = path.join(originFolder, `${safeTitle}.md`);
    await fs.writeFile(targetNotePath, markdownWithFrontmatter, 'utf-8');

    await fs.mkdir(this.processedPath, { recursive: true });
    const timestamp = Date.now();
    const archivedFilePath = path.join(
      this.processedPath,
      `${timestamp}_${path.basename(originalFilePath)}`
    );

    await fs.copyFile(originalFilePath, archivedFilePath);
    await fs.unlink(originalFilePath);

    return targetNotePath;
  }
}