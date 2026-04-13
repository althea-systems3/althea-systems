import { describe, expect, it } from 'vitest';

import {
  parseEditorialInlineNodes,
  parseEditorialMarkdown,
} from '@/lib/static-pages/editorialMarkdown';

describe('editorial markdown parser', () => {
  it('parses headings paragraphs and lists', () => {
    const markdown = `## Titre\nParagraphe de test.\n\n### Sous-titre\n- item 1\n- item 2\n\n1. first\n2. second`;

    const blocks = parseEditorialMarkdown(markdown);

    expect(blocks.map((block) => block.type)).toEqual([
      'h2',
      'paragraph',
      'h3',
      'list',
      'list',
    ]);
  });

  it('parses inline links with safe href', () => {
    const nodes = parseEditorialInlineNodes(
      "Consultez [la page contact](/contact) pour plus d'informations.",
    );

    expect(nodes.some((node) => node.type === 'link')).toBe(true);
  });

  it('keeps unsafe links as plain text', () => {
    const nodes = parseEditorialInlineNodes(
      "Lien [dangereux](javascript:alert('x')).",
    );

    const hasUnsafeLinkNode = nodes.some((node) => node.type === 'link');
    expect(hasUnsafeLinkNode).toBe(false);
  });
});
