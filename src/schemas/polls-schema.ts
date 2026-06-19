import type { CollectionSchema } from 'deepspace/worker'

/**
 * A creator-owned poll: one question with its type, options, and settings.
 * The atomic authoring unit. Public read so the voter view loads without auth;
 * only the owning creator writes. `options`/`settings` are json columns: pass
 * the value directly on create, it round-trips parsed (no manual JSON.stringify).
 */
export const pollsSchema: CollectionSchema = {
  name: 'polls',
  columns: [
    { name: 'title', storage: 'text', interpretation: 'plain', required: true },
    { name: 'type', storage: 'text', interpretation: { kind: 'select', options: ['choice', 'multi', 'wordcloud', 'qa', 'scale', 'nps', 'ranking', 'numeric', 'quiz'] }, required: true },
    { name: 'options', storage: 'text', interpretation: { kind: 'json' }, default: [] },
    { name: 'settings', storage: 'text', interpretation: { kind: 'json' }, default: {} },
    { name: 'deckId', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'order', storage: 'number', interpretation: 'plain', default: 0 },
    { name: 'ownerId', storage: 'text', interpretation: 'plain', required: true, userBound: true, immutable: true },
  ],
  ownerField: 'ownerId',
  permissions: {
    viewer: { read: true, create: false, update: false, delete: false },
    member: { read: true, create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
