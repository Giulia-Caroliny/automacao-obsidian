import os
from google import genai
from google.genai import errors
from dotenv import load_dotenv

load_dotenv()

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "credenciais.json"

PROJECT_ID = os.getenv("PROJECT_ID")

LOCATION = "us-central1"

print("Inicializando conexão com o Google Cloud (Vertex AI)...")

client = genai.Client(
    vertexai=True, 
    project=PROJECT_ID, 
    location=LOCATION
)

def processar_resumo():
    material_aula = """
    Bancos de Dados Relacionais baseiam-se no modelo relacional, utilizando tabelas para representar dados e suas relações. 
    A linguagem padrão é o SQL (Structured Query Language). Propriedades ACID (Atomicidade, Consistência, Isolamento, Durabilidade) 
    garantem transações seguras. Chave primária identifica unicamente um registro, e chave estrangeira cria vínculos entre tabelas.
    """

    minhas_duvidas = """
    - Errei uma questão sobre a diferença exata entre Isolamento e Durabilidade no ACID.
    - Fiquei confusa com chave estrangeira: ela pode ser nula?
    - Focar em como isso cai na prática.
    """

    prompt = f"""
    Você é um assistente de estudos avançado. O seu objetivo é pegar o material de base e as dúvidas do aluno e gerar uma nota estruturada em Markdown para o Obsidian.

    Material Base:
    {material_aula}

    Dúvidas e Fraquezas do Aluno:
    {minhas_duvidas}

    Regras de formatação:
    1. Crie um título principal com H1 (#).
    2. Explique o conteúdo base de forma didática.
    3. Crie uma seção específica chamada "🔥 Foco e Correções" aprofundando as dúvidas do aluno.
    4. No final, adicione 3 tags relevantes (ex: #banco-de-dados).
    """

    print("Enviando requisição para a Vertex AI...")
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=prompt
        )
        
        print("\n✅ Sucesso! Aqui está o resumo gerado:\n")
        print("-" * 50)
        print(response.text)
        print("-" * 50)
        
    except errors.APIError as e:
        print(f"❌ Ocorreu um erro na API: {e.message}")
    except Exception as e:
        print(f"❌ Ocorreu um erro inesperado: {e}")

if __name__ == "__main__":
    processar_resumo()