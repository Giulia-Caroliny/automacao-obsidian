import { z } from 'zod';

const WIKILINK_REGEX = /^\[\[[^\[\]\n\r]+\]\]$/;

const HIERARCHICAL_TAG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

const OBSIDIAN_INVALID_CHARS_REGEX = /[\\/*?":<>|#^\[\]]/;

export const KnowledgeOriginEnum = z.enum([
  'Concurso',
  'Pos_Graduacao_1_Engenharia_de_IA_Cruzeiro_do_Sul',
  'Pos_Graduacao_2_Engenharia_de_IA_UNIPDS',
  'Certificacao_AWS',
  'Artigo_Externo',
]);

const wikilinkSchema = (campo: string) =>
  z
    .string()
    .trim()
    .regex(WIKILINK_REGEX, {
      message: `O campo ${campo} deve estar no formato Wikilink: "[[Título da Nota]]".`,
});

export const ProcessedNoteSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(3, { message: 'O título deve ter no mínimo 3 caracteres.' })
    .max(120, { message: 'O título deve ter no máximo 120 caracteres.' })
    .refine((val) => !OBSIDIAN_INVALID_CHARS_REGEX.test(val), {
      message: 'O título não pode conter caracteres especiais proibidos pelo Obsidian (* " \\ / < > : | ? # ^ [ ]).',
    })
    .describe('Título claro, conciso e atômico para o arquivo no Obsidian (sem caracteres especiais).'),

  origem: KnowledgeOriginEnum.describe(
    'Classificação da origem do conhecimento baseada no vocabulário e contexto da nota.'
  ),

  tags: z
    .array(
      z
        .string()
        .trim()
        .regex(HIERARCHICAL_TAG_REGEX, {
          message: 'Cada tag deve seguir o formato hierárquico em kebab-case minúsculo (ex: "cloud/aws" ou "seguranca/iam-policy").',
        })
    )
    .min(2, { message: 'A nota deve conter pelo menos 2 tags.' })
    .max(5, { message: 'A nota deve conter no máximo 5 tags.' })
    .describe('Lista de 2 a 5 tags hierárquicas em kebab-case, ex: ["cloud/aws", "seguranca/iam"].'),

  moc: wikilinkSchema('MOC').describe(
    'Map of Content principal no formato Wikilink, ex: "[[MOC - Certificação AWS]]".'
  ),

  links_existentes: z
    .array(wikilinkSchema('Link Existente'))
    .describe('Lista de títulos EXATOS de notas já existentes no Vault que se conectam a este tema.'),

  novos_conceitos: z
    .array(wikilinkSchema('Novo Conceito'))
    .min(1, { message: 'Defina ao menos 1 novo conceito estudável.' })
    .max(3, { message: 'Limite máximo de 3 novos conceitos por nota para manter a atomicidade.' })
    .describe('Lista de 1 a 3 conceitos-chave estudáveis no formato "[[Conceito]]".'),

  resumo_executivo: z
    .string()
    .trim()
    .min(30, { message: 'O resumo executivo deve ter pelo menos 30 caracteres (1 a 2 frases completas).' })
    .max(400, { message: 'O resumo executivo não deve ultrapassar 400 caracteres.' })
    .describe('Síntese de 1 a 2 frases do conteúdo central da nota.'),

  conteudo_markdown: z
    .string()
    .trim()
    .min(50, { message: 'O conteúdo em Markdown está muito curto para uma nota estruturada.' })
    .describe('Corpo completo do resumo reescrito e estruturado em Markdown.'),
});

export type ProcessedNote = z.infer<typeof ProcessedNoteSchema>;

export interface SubGraphNeighbor {
  titulo: string;
  origem: string;
  tags: string[];
  resumo: string;
  relacionados: string[];
  distancia?: number;
}

export interface VectorNoteRecord extends Record<string, unknown> {
  id: string;
  titulo: string;
  origem: string;
  tags_json: string;
  relacionados_json: string;
  resumo: string;
  vector: number[];
}