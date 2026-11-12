import { ProcessedNote, SubGraphNeighbor } from '../schemas/note.schema';
import { DeterministicMetrics, GoldenTestCase } from './eval.schema';

export class MetricsCalculator {
  private static normalizeLink(link: string): string {
    return link
      .replace(/^\[\[|\]\]$/g, '')
      .trim()
      .toLowerCase();
  }

  static evaluate(
    testCase: GoldenTestCase,
    generatedNote: ProcessedNote
  ): DeterministicMetrics {
    const originCorrect = generatedNote.origem === testCase.expectedOrigin;

    // Conjunto de todos os nós válidos disponíveis no sub-grafo 2-hop do LanceDB
    const validSubGraphNodes = new Set<string>();
    for (const neighbor of testCase.mockedNeighbors) {
      validSubGraphNodes.add(this.normalizeLink(neighbor.titulo));
      for (const rel of neighbor.relacionados) {
        validSubGraphNodes.add(this.normalizeLink(rel));
      }
    }

    const predictedLinks = generatedNote.links_existentes.map((l) =>
      this.normalizeLink(l)
    );
    const expectedLinks = testCase.expectedExistingLinks.map((l) =>
      this.normalizeLink(l)
    );
    const expectedSet = new Set(expectedLinks);

    // 1. Groundedness: Quantos links ditos "existentes" realmente vieram do sub-grafo?
    const groundedCount = predictedLinks.filter((link) =>
      validSubGraphNodes.has(link)
    ).length;
    const linkGroundedness =
      predictedLinks.length > 0 ? groundedCount / predictedLinks.length : 1.0;

    // 2. Precision & Recall contra os links esperados no Golden Dataset
    const truePositives = predictedLinks.filter((link) =>
      expectedSet.has(link)
    ).length;

    const linkPrecision =
      predictedLinks.length > 0 ? truePositives / predictedLinks.length : 0.0;

    const linkRecall =
      expectedLinks.length > 0 ? truePositives / expectedLinks.length : 1.0;

    return {
      originCorrect,
      linkGroundedness: Number(linkGroundedness.toFixed(4)),
      linkPrecision: Number(linkPrecision.toFixed(4)),
      linkRecall: Number(linkRecall.toFixed(4)),
    };
  }
}