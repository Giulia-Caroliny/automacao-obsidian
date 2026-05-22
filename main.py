import os
from urllib import response
from google import genai
from google.genai import errors
from dotenv import load_dotenv
from salvar_nota import salvar_nota_obsidian
import leitor_arquivos
import limpar_arquivos

load_dotenv()

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "credenciais.json"

PROJECT_ID = os.getenv("PROJECT_ID")
PASTA_OUTPUT = os.getenv("PASTA_OUTPUT")
PASTA_INPUT = os.getenv("PASTA_INPUT")

LOCATION = "us-central1"

print("Inicializando conexão com o Google Cloud (Vertex AI)...")

client = genai.Client(
    vertexai=True, 
    project=PROJECT_ID, 
    location=LOCATION
)

def processar_resumo():
    print(f"🔍 Varrendo a pasta {PASTA_INPUT} em busca de materiais...")
    
    lote = leitor_arquivos.mapear_pasta_estudos(PASTA_INPUT)
    
    if not lote:
        print("✨ Nenhum material novo com o sufixo '_base' encontrado para processar.")
        return

    for item in lote:
        print(f"\n🧠 Processando com Gemini 2.5 Pro: {item['titulo']}...")

        prompt = f"""
            Você é um assistente de estudos avançado. 
        
            🎯 CONTEXTO E OBJETIVO DE ESTUDO: 
            A fonte deste material é '{item['fonte']}'. 
            Adapte rigorosamente a linguagem e o nível de profundidade do resumo para este contexto:
            - Se a fonte for relacionada a 'Concurso', foque estritamente em como o assunto é cobrado em provas objetivas de múltipla escolha (com ênfase no estilo de bancas como a Cesgranrio), destacando "pegadinhas" teóricas e jargões de edital. Ignore floreios acadêmicos.
            - Se a fonte for 'Pós' ou acadêmica, aprofunde a teoria, conceitos base e discussões analíticas.
            - Se a fonte for certificação de mercado (ex: AWS, Docker, Laravel), foque na aplicação prática, comandos e arquitetura de sistemas.
            - Para fontes genéricas ou de "Geral", mantenha um equilíbrio entre teoria e prática, mas sempre com foco em aplicabilidade.

            Material Base:
            {item['material_base']}

            Dúvidas e Fraquezas do Aluno:
            {item['anotacoes_aluno']}

            Regras de formatação:
            1. Crie um título principal com H1 (#).
            2. Explique o conteúdo base de forma didática baseada na Fonte.
            3. Crie uma seção específica chamada "🔥 Foco e Correções" aprofundando as dúvidas ou observações do aluno (se houver notas).
            4. No final, adicione 4 tags relevantes. Uma das tags DEVE OBRIGATORIAMENTE ser #{item['fonte'].replace(" ", "-").lower()}.

            REGRA DE SISTEMA CRÍTICA:
            NÃO inclua nenhuma saudação, introdução ou conclusão. Retorne APENAS o texto bruto em Markdown.
            NÃO envolva a resposta em blocos de código (```markdown).
            """

        print("Enviando requisição para a Vertex AI...")
        
        try:
            response = client.models.generate_content(
                model="gemini-2.5-pro",
                contents=prompt
            )
            
            salvar_nota_obsidian(item['titulo'], response.text)
            print("Processamento concluído com sucesso!")

            limpar_arquivos.mover_pdf_base(item['arquivo_base_original'])
            limpar_arquivos.deletar_notas(item['arquivos_notas_originais'])
            
        except errors.APIError as e:
            print(f"❌ Ocorreu um erro na API: {e.message}")
        except Exception as e:
            print(f"❌ Ocorreu um erro inesperado: {e}")

if __name__ == "__main__":
    processar_resumo()