import chokidar from 'chokidar';
import fs from 'fs/promises';
import path from 'path';
import { env } from './config/env';
import { FileExtractor } from './services/extractor';
import { VaultIndexer } from './services/vault-indexer';
import { KnowledgeGraphAgent } from './services/llm-agent';
import { VaultWriter } from './services/vault-writer';

async function bootstrap() {
  await fs.mkdir(env.INBOX_PATH, { recursive: true });
  await fs.mkdir(env.PROCESSED_PATH, { recursive: true });
  await fs.mkdir(env.VAULT_PATH, { recursive: true });

  const indexer = new VaultIndexer(env.VAULT_PATH);
  const agent = new KnowledgeGraphAgent();
  const writer = new VaultWriter(env.VAULT_PATH, env.PROCESSED_PATH);

  let processingQueue = Promise.resolve();

  const handleNewFile = async (filePath: string) => {
    const fileName = path.basename(filePath);

    if (fileName.startsWith('.') || !FileExtractor.isSupported(filePath)) {
      return;
    }

    try {
      console.log(`\n[1/4] Iniciando leitura de: ${fileName}`);
      const rawText = await FileExtractor.extractText(filePath);

      if (!rawText.trim()) {
        console.warn(`[Aviso] O arquivo ${fileName} está vazio. Ignorando.`);
        return;
      }

      console.log(`[2/4] Escaneando índice do grafo no Obsidian Vault...`);
      const catalog = await indexer.getGraphCatalog();
      console.log(`      -> ${catalog.length} notas existentes mapeadas.`);

      console.log(`[3/4] Processando resumo e conexões via Gemini (${env.GEMINI_MODEL})...`);
      const structuredNote = await agent.processRawNote(
        rawText,
        fileName,
        catalog
      );

      console.log(`[4/4] Gravando nota no Vault [Origem: ${structuredNote.origem}]...`);
      const savedPath = await writer.saveToVault(structuredNote, filePath);
      console.log(`[Sucesso] Nota criada em: ${savedPath}`);
    } catch (error) {
      console.error(`[Erro] Falha ao processar ${fileName}:`, error);
    }
  };

  console.log(`====================================================`);
  console.log(` Obsidian Graph Agent iniciado!`);
  console.log(` Monitorando Inbox: ${env.INBOX_PATH}`);
  console.log(` Obsidian Vault:    ${env.VAULT_PATH}`);
  console.log(` Polling Ativo:     ${env.CHOKIDAR_USEPOLLING}`);
  console.log(`====================================================`);

  const watcher = chokidar.watch(env.INBOX_PATH, {
    persistent: true,
    ignoreInitial: false,
    depth: 0,
    usePolling: env.CHOKIDAR_USEPOLLING,
    interval: 1000,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 200,
    },
  });

  watcher.on('add', (filePath) => {
    processingQueue = processingQueue.then(() => handleNewFile(filePath));
  });

  const shutdown = async () => {
    console.log('\nEncerrando watcher de forma segura...');
    await watcher.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap();
