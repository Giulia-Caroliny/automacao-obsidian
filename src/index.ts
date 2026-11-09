import chokidar from 'chokidar';
import fs from 'fs/promises';
import path from 'path';
import { env } from './config/env';
import { FileExtractor } from './services/extractor';

async function bootstrap() {
  await fs.mkdir(env.INBOX_PATH, { recursive: true });
  await fs.mkdir(env.PROCESSED_PATH, { recursive: true });
  await fs.mkdir(env.VAULT_PATH, { recursive: true });

    let processingQueue = Promise.resolve();

    const handleNewFile = async (filePath: string) => {
    const fileName = path.basename(filePath);

    if (fileName.startsWith('.') || !FileExtractor.isSupported(filePath)) {
      return;
    }

    try {
      console.log(`\n Iniciando leitura de: ${fileName}`);
      const rawText = await FileExtractor.extractText(filePath);

      if (typeof rawText !== 'string') {
        console.error(`❌ [Erro] Retorno não é string! Tipo recebido: ${typeof rawText}`);
        return;
      }

      if (!rawText.trim()) {
        console.warn(`[Aviso] O arquivo ${fileName} está vazio. Ignorando.`);
        return;
      }

      console.log(`✅ [Sucesso] Lido com sucesso!`);
      console.log(`   - Tipo: ${typeof rawText}`);
      console.log(`   - Caracteres totais: ${rawText.length}`);
      console.log(`   - Prévia (primeiros 150 caracteres):`);
      console.log('--- INÍCIO DA PRÉVIA ---');
      console.log(rawText.slice(0, 150).trim());
      console.log('--- FIM DA PRÉVIA ---\n');

    } catch (error) {
      console.error(`[Erro] Falha ao processar ${fileName}:`, error);
    }
  };

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