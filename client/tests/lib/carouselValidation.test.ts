import { describe, expect, it } from 'vitest';

import {
  isValidRedirectUrl,
  isValidImageMimeType,
  isImageWithinSizeLimit,
  generateSecureFileName,
} from '@/lib/carousel/validation';

describe('isValidRedirectUrl', () => {
  it('accepte une URL interne commençant par /', () => {
    expect(isValidRedirectUrl('/produits')).toBe(true);
    expect(isValidRedirectUrl('/contact')).toBe(true);
    expect(isValidRedirectUrl('/fr/catalogue/bijoux')).toBe(true);
  });

  it('rejette une URL javascript:', () => {
    expect(isValidRedirectUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejette une URL data:', () => {
    expect(isValidRedirectUrl('data:text/html,<h1>hack</h1>')).toBe(false);
  });

  it('rejette une URL vbscript:', () => {
    expect(isValidRedirectUrl('vbscript:msgbox("hack")')).toBe(false);
  });

  it('rejette une URL externe absolue', () => {
    expect(isValidRedirectUrl('https://evil.com')).toBe(false);
    expect(isValidRedirectUrl('http://attacker.io/phish')).toBe(false);
  });

  it('rejette une chaîne vide', () => {
    expect(isValidRedirectUrl('')).toBe(false);
    expect(isValidRedirectUrl('   ')).toBe(false);
  });
});

describe('isValidImageMimeType', () => {
  it('accepte les types MIME autorisés', () => {
    expect(isValidImageMimeType('image/jpeg')).toBe(true);
    expect(isValidImageMimeType('image/png')).toBe(true);
    expect(isValidImageMimeType('image/webp')).toBe(true);
  });

  it('rejette les types MIME non autorisés', () => {
    expect(isValidImageMimeType('image/gif')).toBe(false);
    expect(isValidImageMimeType('image/svg+xml')).toBe(false);
    expect(isValidImageMimeType('text/html')).toBe(false);
    expect(isValidImageMimeType('application/pdf')).toBe(false);
  });
});

describe('isImageWithinSizeLimit', () => {
  it('accepte une image de 1 Mo', () => {
    const oneMegabyte = 1 * 1024 * 1024;

    expect(isImageWithinSizeLimit(oneMegabyte)).toBe(true);
  });

  it('accepte une image de exactement 5 Mo', () => {
    const fiveMegabytes = 5 * 1024 * 1024;

    expect(isImageWithinSizeLimit(fiveMegabytes)).toBe(true);
  });

  it('rejette une image de 6 Mo', () => {
    const sixMegabytes = 6 * 1024 * 1024;

    expect(isImageWithinSizeLimit(sixMegabytes)).toBe(false);
  });

  it('rejette une taille nulle ou négative', () => {
    expect(isImageWithinSizeLimit(0)).toBe(false);
    expect(isImageWithinSizeLimit(-100)).toBe(false);
  });
});

describe('generateSecureFileName', () => {
  it('génère un nom avec le bon format', () => {
    const fileName = generateSecureFileName(
      'photo.jpg',
      'slide-123',
      'desktop',
    );

    expect(fileName).toMatch(/^carousel\/slide-123\/desktop-\d+\.jpg$/);
  });

  it('nettoie les caractères spéciaux du nom original', () => {
    const fileName = generateSecureFileName(
      '../../../etc/passwd.png',
      'slide-456',
      'mobile',
    );

    expect(fileName).not.toContain('../');
    expect(fileName).toMatch(/^carousel\/slide-456\/mobile-\d+\.png$/);
  });

  it('différencie desktop et mobile', () => {
    const desktopName = generateSecureFileName('img.webp', 'id-1', 'desktop');
    const mobileName = generateSecureFileName('img.webp', 'id-1', 'mobile');

    expect(desktopName).toContain('/desktop-');
    expect(mobileName).toContain('/mobile-');
  });
});
