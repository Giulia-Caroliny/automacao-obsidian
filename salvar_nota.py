import os
import dotenv

dotenv.load_dotenv()

PASTA_OBSIDIAN = os.getenv("PASTA_OUTPUT")

def salvar_nota_obsidian(titulo, conteudo_markdown):
    os.makedirs(PASTA_OBSIDIAN, exist_ok=True)
    
    caminho_completo = os.path.join(PASTA_OBSIDIAN, f"{titulo}.md")
    
    with open(caminho_completo, "w", encoding="utf-8") as arquivo:
        arquivo.write(conteudo_markdown)
        
    print(f"✅ Nota salva com sucesso em: {caminho_completo}")