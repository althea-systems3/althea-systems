import { describe, expect, it } from 'vitest';

import { sanitizeText } from '@/lib/auth/sanitize';

describe('Sécurité — injection SQL via sanitizeText', () => {
  it('les payloads SQL injection passent sans erreur (Supabase paramétré)', () => {
    const payloads = [
      "'; DROP TABLE utilisateur; --",
      '1 OR 1=1',
      "admin'--",
      '1; DELETE FROM commande',
      "' UNION SELECT * FROM utilisateur --",
    ];

    for (const payload of payloads) {
      const sanitized = sanitizeText(payload);
      // sanitizeText ne modifie pas le SQL brut (pas de HTML)
      // La protection SQL injection est assurée par les requêtes paramétrées Supabase
      expect(typeof sanitized).toBe('string');
      expect(sanitized.length).toBeGreaterThan(0);
    }
  });
});

describe('Sécurité — XSS via sanitizeText', () => {
  it('neutralise les balises script', () => {
    const payloads = [
      '<script>alert("xss")</script>',
      '<SCRIPT>document.cookie</SCRIPT>',
      '<script type="text/javascript">fetch("evil")</script>',
    ];

    for (const payload of payloads) {
      const sanitized = sanitizeText(payload);
      expect(sanitized).not.toMatch(/<script/i);
    }
  });

  it('neutralise les balises avec event handlers', () => {
    const payloads = [
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      '<body onload=alert(1)>',
      '<div onmouseover=alert(1)>hover</div>',
    ];

    for (const payload of payloads) {
      const sanitized = sanitizeText(payload);
      expect(sanitized).not.toMatch(/<img/i);
      expect(sanitized).not.toMatch(/<svg/i);
      expect(sanitized).not.toMatch(/<body/i);
      expect(sanitized).not.toMatch(/<div/i);
    }
  });

  it('neutralise les iframes et objets embarqués', () => {
    const payloads = [
      '<iframe src="evil.com"></iframe>',
      '<object data="evil.swf"></object>',
      '<embed src="evil.swf">',
    ];

    for (const payload of payloads) {
      const sanitized = sanitizeText(payload);
      expect(sanitized).not.toMatch(/<iframe/i);
      expect(sanitized).not.toMatch(/<object/i);
      expect(sanitized).not.toMatch(/<embed/i);
    }
  });

  it('neutralise les injections dans attributs', () => {
    expect(sanitizeText('"><script>alert(1)</script>')).not.toContain(
      '<script',
    );
    expect(sanitizeText("'><img src=x onerror=alert(1)>")).not.toContain(
      '<img',
    );
  });

  it('préserve le texte légitime intact', () => {
    const legitimate = [
      'Bonjour, je souhaite commander un produit.',
      "L'adresse email est test@example.com",
      'Prix : 149,99 € TTC',
      'Référence CMD-2026-00001',
      'Merci & à bientôt !',
    ];

    for (const text of legitimate) {
      expect(sanitizeText(text)).toBe(text);
    }
  });
});
