import os
import re
from pypdf import PdfReader

def ler_txt(caminho_arquivo: str) -> str:
    """Abre e extrai o texto de um arquivo TXT."""
    try:
        with open(caminho_arquivo, "r", encoding="utf-8") as f:
            return f.read().strip()
    except Exception as e:
        print(f"❌ Erro ao ler TXT {caminho_arquivo}: {e}")
        return ""

def ler_pdf(caminho_arquivo: str) -> str:
    """Abre e extrai o texto de todas as páginas de um arquivo PDF."""
    try:
        reader = PdfReader(caminho_arquivo)
        texto_completo = []
        
        for pagina in reader.pages:
            texto_pagina = pagina.extract_text()
            if texto_pagina:
                texto_completo.append(texto_pagina)
                
        return "\n".join(texto_completo).strip()
    except Exception as e:
        print(f"❌ Erro ao ler PDF {caminho_arquivo}: {e}")
        return ""

def mapear_pasta_estudos(pasta_origem: str) -> list:
    """
    Varre a pasta de origem, identifica os materiais base (PDF/TXT),
    extrai a fonte dos colchetes [Fonte] e tenta encontrar notas correspondentes.
    """
    os.makedirs(pasta_origem, exist_ok=True)
    
    todos_arquivos = os.listdir(pasta_origem)
    print(f"🔎 Encontrados {len(todos_arquivos)} arquivos na pasta de estudos.")
    for arquivo in todos_arquivos:
        print(f"   - {arquivo}")
    # 2. Filtra manualmente apenas os que terminam com _base.pdf ou _base.txt
    arquivos_base = [
        os.path.join(pasta_origem, arquivo) 
        for arquivo in todos_arquivos 
        if arquivo.endswith("_base.pdf") or arquivo.endswith("_base.txt")
    ]
                    
    lote_de_estudos = []
    
    for caminho_base in arquivos_base:
        nome_arquivo = os.path.basename(caminho_base)
    
        titulo_bruto = nome_arquivo.replace("_base.pdf", "").replace("_base.txt", "")
        
        match = re.match(r"\[(.*?)\]\s*(.*)", titulo_bruto)
        
        if match:
            fonte = match.group(1)
            titulo_estudo = match.group(2)
        else:
            fonte = "Geral"
            titulo_estudo = titulo_bruto
            
        caminho_notas = os.path.join(pasta_origem, f"{titulo_bruto}_notas.txt")
        
        if caminho_base.endswith(".pdf"):
            texto_base = ler_pdf(caminho_base)
        else:
            texto_base = ler_txt(caminho_base)
            
        texto_notas = ""
        if os.path.exists(caminho_notas):
            texto_notas = ler_txt(caminho_notas)
            
        if texto_base:
            lote_de_estudos.append({
                "fonte": fonte,
                "titulo": titulo_estudo.replace("_", " ").title(),
                "material_base": texto_base,
                "anotacoes_aluno": texto_notas,
                "arquivo_base_original": caminho_base,
                "arquivo_notas_original": caminho_notas
            })
            
    return lote_de_estudos