import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';

export class FileExtractor {
  private static supportedExtensions = ['.txt', '.md', '.docx', '.pdf'];

  static isSupported(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.supportedExtensions.includes(ext);
  }

  static async extractText(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.txt' || ext === '.md') {
      return await fs.readFile(filePath, 'utf-8');
    }

    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }
    
    if (ext === '.pdf') {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    }

    throw new Error(`Formato de arquivo não suportado: ${ext}`);
  }
}