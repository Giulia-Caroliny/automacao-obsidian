import { describe, it, expect } from 'vitest';
import {
  KnowledgeOriginEnum,
  ProcessedNoteSchema,
  type ProcessedNote,
} from './note.schema';

// ============================================================================
// 1. FIXTURES & HELPERS
// ============================================================================

/**
 * Cria um objeto 100% válido por padrão, permitindo sobrescrever
 * apenas o campo que queremos testar em cada cenário.
 */
const makeValidNote = (overrides: Partial<Record<keyof ProcessedNote, any>> = {}): ProcessedNote => ({
  titulo: 'Arquitetura de Seguranca no AWS IAM',
  origem: 'Certificacao_AWS',
  tags: ['cloud/aws', 'seguranca/iam'],
  moc: '[[MOC - Certificação AWS]]',
  links_existentes: ['[[ Politicas do IAM ]]', '[[ Roles e Permissoes ]]'],
  novos_conceitos: ['[[ Principio do Menor Privilegio ]]'],
  resumo_executivo: 'Resumo sobre como estruturar permissões seguras na AWS usando IAM.',
  conteudo_markdown: '> [!info] Conceito\n> O [[ Principio do Menor Privilegio ]] é essencial...',
  ...overrides,
});

// ============================================================================
// 2. TESTES DO ENUM: KnowledgeOriginEnum
// ============================================================================

describe('KnowledgeOriginEnum', () => {
  it.each([
    'Pos_Graduacao_1_Engenharia_de_IA_Cruzeiro_do_Sul',
    'Pos_Graduacao_2_Engenharia_de_IA_UNIPDS',
    'Certificacao_AWS',
    'Artigo_Externo',
  ])('deve aceitar a origem válida: "%s"', (validOrigin) => {
    const result = KnowledgeOriginEnum.safeParse(validOrigin);
    expect(result.success).toBe(true);
  });

  it('deve rejeitar uma origem não mapeada e retornar a mensagem de erro correta', () => {
    const result = KnowledgeOriginEnum.safeParse('Curso_Udemy_Aleatorio');

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues[0];
      expect(issue.code).toBe('invalid_enum_value');
      expect(issue.message).toContain("Invalid enum value. Expected 'Pos_Graduacao_1_Engenharia_de_IA_Cruzeiro_do_Sul'");
    }
  });
});

// ============================================================================
// 3. TESTES DO SCHEMA PRINCIPAL: ProcessedNoteSchema
// ============================================================================

describe('ProcessedNoteSchema', () => {
  
  // --------------------------------------------------------------------------
  // Cenários de Sucesso (Happy Path)
  // --------------------------------------------------------------------------
  describe('✅ Cenários Válidos', () => {
    it('deve validar um objeto completo e corretamente tipado', () => {
      const validData = makeValidNote();
      const result = ProcessedNoteSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('deve remover propriedades extras não declaradas no schema (comportamento strip padrão)', () => {
      const dataWithExtraField = {
        ...makeValidNote(),
        campo_intruso: 'valor que deve sumir',
      };

      const result = ProcessedNoteSchema.safeParse(dataWithExtraField);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('campo_intruso');
      }
    });
  });

  // --------------------------------------------------------------------------
  // Cenários de Campos Ausentes
  // --------------------------------------------------------------------------
  describe('❌ Validação de Campos Obrigatórios (Required)', () => {
    const requiredFields: Array<keyof ProcessedNote> = [
      'titulo',
      'origem',
      'tags',
      'moc',
      'links_existentes',
      'novos_conceitos',
      'resumo_executivo',
      'conteudo_markdown',
    ];

    it.each(requiredFields)('deve falhar com erro "Required" quando o campo "%s" estiver ausente', (field) => {
      const incompleteData = makeValidNote();
      delete incompleteData[field];

      const result = ProcessedNoteSchema.safeParse(incompleteData);

      expect(result.success).toBe(false);
      if (!result.success) {
        const fieldIssue = result.error.issues.find((i) => i.path.includes(field));
        expect(fieldIssue).toBeDefined();
        expect(fieldIssue?.message).toBe('Required');
      }
    });
  });

  // --------------------------------------------------------------------------
  // Cenários de Tipos Inválidos e Mensagens de Erro
  // --------------------------------------------------------------------------
  describe('❌ Validação de Tipos e Mensagens de Erro', () => {
    it('deve retornar erro de tipo quando campos de texto recebem números ou booleanos', () => {
      const invalidNote = makeValidNote({
        titulo: 12345,
        moc: false,
      });

      const result = ProcessedNoteSchema.safeParse(invalidNote);

      expect(result.success).toBe(false);
      if (!result.success) {
        const formattedErrors = result.error.flatten().fieldErrors;
        expect(formattedErrors.titulo).toContain('Expected string, received number');
        expect(formattedErrors.moc).toContain('Expected string, received boolean');
      }
    });

    it('deve retornar erro quando campos de lista (array) recebem uma string simples', () => {
      const invalidNote = makeValidNote({
        tags: 'cloud/aws, seguranca/iam', // Deveria ser array
      });

      const result = ProcessedNoteSchema.safeParse(invalidNote);

      expect(result.success).toBe(false);
      if (!result.success) {
        const formattedErrors = result.error.flatten().fieldErrors;
        expect(formattedErrors.tags).toContain('Expected array, received string');
      }
    });

    it('deve apontar o índice exato do erro quando um item dentro do array não for string', () => {
      const invalidNote = makeValidNote({
        novos_conceitos: ['[[Conceito Valido]]', 999, '[[Outro Valido]]'],
      });

      const result = ProcessedNoteSchema.safeParse(invalidNote);

      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        expect(issue.path).toEqual(['novos_conceitos', 1]); // Índice 1 do array
        expect(issue.message).toBe('Expected string, received number');
      }
    });
  });

  // --------------------------------------------------------------------------
  // Cenários com restrições de min, max e .regex
  // --------------------------------------------------------------------------
  describe('Validações avançadas com regras reais', () => {
    it('deve rejeitar título com caracteres ilegais para o Obsidian', () => {
        const note = makeValidNote({ titulo: 'Notas: Arquitetura/AWS? #1' });
        const result = ProcessedNoteSchema.safeParse(note);

        expect(result.success).toBe(false);
        if (!result.success) {
        expect(result.error.flatten().fieldErrors.titulo).toContain(
            'O título não pode conter caracteres especiais proibidos pelo Obsidian (* " \\ / < > : | ? # ^ [ ]).'
        );
        }
    });

    it('deve falhar se a quantidade de tags estiver fora do intervalo 2-5', () => {
        const tooFew = ProcessedNoteSchema.safeParse(makeValidNote({ tags: ['cloud/aws'] }));
        const tooMany = ProcessedNoteSchema.safeParse(
        makeValidNote({ tags: ['t1', 't2', 't3', 't4', 't5', 't6'] })
        );

        expect(tooFew.success).toBe(false);
        if (!tooFew.success) {
        expect(tooFew.error.flatten().fieldErrors.tags).toContain('A nota deve conter pelo menos 2 tags.');
        }

        expect(tooMany.success).toBe(false);
        if (!tooMany.success) {
        expect(tooMany.error.flatten().fieldErrors.tags).toContain('A nota deve conter no máximo 5 tags.');
        }
    });

    it('deve rejeitar tags fora do padrão hierárquico kebab-case', () => {
        const note = makeValidNote({ tags: ['Cloud_AWS', 'segurança/IAM'] }); // Letras maiúsculas e underline
        const result = ProcessedNoteSchema.safeParse(note);

        expect(result.success).toBe(false);
        if (!result.success) {
        const tagErrors = result.error.issues.filter((i) => i.path[0] === 'tags');
        expect(tagErrors.length).toBeGreaterThan(0);
        expect(tagErrors[0].message).toContain('formato hierárquico em kebab-case');
        }
    });

    it('deve rejeitar MOC ou novos_conceitos sem delimitadores de Wikilink [[ ]]', () => {
        const note = makeValidNote({
        moc: 'MOC - Certificação AWS', // Falta [[ ]]
        novos_conceitos: ['Princípio do Menor Privilégio'], // Falta [[ ]]
        });
        const result = ProcessedNoteSchema.safeParse(note);

        expect(result.success).toBe(false);
        if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors;
        expect(fieldErrors.moc).toContain('O campo MOC deve estar no formato Wikilink: "[[Título da Nota]]".');
        expect(result.error.issues.some((i) => i.path[0] === 'novos_conceitos')).toBe(true);
        }
    });
  });
});