import * as prismic from '@prismicio/client';

export function getAnyTitle(doc: prismic.PrismicDocument): string {
  if (doc.uid) {
    return doc.uid;
  }

  const candidates = [
    'nom_du_contenu_prismic',
    'nom_prismic',
    'title',
    'titre',
    'label',
  ];

  const data = (doc as any).data;

  if (!data || typeof data !== 'object') return doc.id;

  const found = candidates
    .map(key => {
      if (!Object.hasOwn(data, key)) return null;
      const v = data[key];
      if (v == null) return null;
      if (typeof v === 'string') {
        const t = v.trim();
        return t.length ? t : null;
      }
      if (typeof v === 'number' || typeof v === 'boolean') return String(v);
      return null;
    })
    .filter((v): v is string => typeof v === 'string' && v.length > 0);

  if (found.length === 0) {
    return doc.id;
  }

  found.sort((a, b) => b.length - a.length);
  return found[0];
}
