import os
import shutil
from dotenv import load_dotenv


load_dotenv()
PASTA_PDFS = os.getenv("PASTA_PDFS")
PASTA_INPUT = os.getenv("PASTA_INPUT")

def deletar_notas(caminho_notas):
    if caminho_notas and os.path.exists(caminho_notas):
        os.remove(caminho_notas)
        print(f"🧹 Arquivo temporário de notas deletado com sucesso.")

def mover_pdf_base(caminho_base):
    if caminho_base and os.path.exists(caminho_base):
        nome_arquivo_base = os.path.basename(caminho_base)
        destino_pdf = os.path.join(PASTA_PDFS, nome_arquivo_base)
        
        shutil.move(caminho_base, destino_pdf)
        print(f"📁 Movido: {nome_arquivo_base} para a pasta de PDFs.")

def limpar_pasta_input():
    if os.path.exists(PASTA_INPUT):
        arquivos = os.listdir(PASTA_INPUT)
        for arquivo in arquivos:
            caminho_arquivo = os.path.join(PASTA_INPUT, arquivo)
            if os.path.isfile(caminho_arquivo):
                os.remove(caminho_arquivo)
                print(f"🧹 Arquivo {arquivo} deletado da pasta de input.")