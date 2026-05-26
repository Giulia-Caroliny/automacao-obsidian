import os
from google.genai import types
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from google import genai
from dotenv import load_dotenv
import salvar_nota

load_dotenv()

PROJECT_ID = os.getenv("PROJECT_ID")

LOCATION = "us-central1"

print("Inicializando conexão com o Google Cloud (Vertex AI)...")

client = genai.Client(
    vertexai=True, 
    project=PROJECT_ID, 
    location=LOCATION
)

app = FastAPI()

@app.post("/processar")
async def processar_documento(
    fonte: str = Form(...),
    arquivo_base: UploadFile = File(...),
    anotacoes_extras: str = Form(default="")
):
    try:
        conteudo_base = await arquivo_base.read()

        prompt = f"""
            Você é um assistente de estudos avançado. 
        
            🎯 CONTEXTO E OBJETIVO DE ESTUDO: 
            A fonte deste material é '{fonte}'. 
            Adapte rigorosamente a linguagem e o nível de profundidade do resumo para este contexto:
            - Se a fonte for relacionada a 'Concurso', foque estritamente em como o assunto é cobrado em provas objetivas de múltipla escolha (com ênfase no estilo de bancas como a Cesgranrio), destacando "pegadinhas" teóricas e jargões de edital. Ignore floreios acadêmicos.
            - Se a fonte for 'Pós' ou acadêmica, aprofunde a teoria, conceitos base e discussões analíticas.
            - Se a fonte for certificação de mercado (ex: AWS, Docker, Laravel), foque na aplicação prática, comandos e arquitetura de sistemas.
            - Para fontes genéricas ou de "Geral", mantenha um equilíbrio entre teoria e prática, mas sempre com foco em aplicabilidade.

            Dúvidas e Fraquezas do Aluno:
            {anotacoes_extras}

            Regras de formatação:
            1. Crie um título principal com H1 (#).
            2. Explique o conteúdo base de forma didática baseada na Fonte.
            3. Crie uma seção específica chamada "🔥 Foco e Correções" aprofundando as dúvidas ou observações do aluno (se houver notas).
            4. No final, adicione 4 tags relevantes. Uma das tags DEVE OBRIGATORIAMENTE ser #{fonte.replace(" ", "-").lower()}.

            REGRA DE SISTEMA CRÍTICA:
            NÃO inclua nenhuma saudação, introdução ou conclusão. Retorne APENAS o texto bruto em Markdown.
            NÃO envolva a resposta em blocos de código (```markdown).
            """
        
        dados_arquivo_base = types.Part.from_bytes(
            data=conteudo_base,
            mime_type=arquivo_base.content_type 
        )
        
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=[prompt, dados_arquivo_base]
        )
        
        salvar_nota.salvar_nota_obsidian(arquivo_base.filename, response.text)
        
        return {
            "status": "sucesso", 
            "mensagem": f"Nota de '{arquivo_base.filename}' processada e salva no cofre!"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno ao processar o documento: {str(e)}")
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)