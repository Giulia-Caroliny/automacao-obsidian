import fs from 'fs/promises';
import path from 'path';
import { env } from './config/env';

async function bootstrap() {
  const directories = {
    Inbox: env.INBOX_PATH,
    Processed: env.PROCESSED_PATH,
    Vault: env.VAULT_PATH,
  };

  for (const [name, dirPath] of Object.entries(directories)) {
    await fs.mkdir(dirPath, { recursive: true });

    const items = await fs.readdir(dirPath, { withFileTypes: true });

    console.log(`\n📂 [${name}] ${dirPath}:`);
    if (items.length === 0) {
      console.log('  (vazio)');
    } else {
      for (const item of items) {
        const type = item.isDirectory() ? '[DIR]' : '[FILE]';
        console.log(`  ${type} ${item.name}`);
      };
    }
  }
}

bootstrap().catch((err) => {
  console.error('Erro ao executar bootstrap:', err);
});