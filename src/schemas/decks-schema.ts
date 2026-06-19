import type { CollectionSchema } from 'deepspace/worker'

/**
 * An ordered sequence of polls a creator advances through live (S2).
 * `pollIds` is an ordered json array. Same permission posture as polls:
 * public read for the live follow-along, owner-only writes.
 */
export const decksSchema: CollectionSchema = {
  name: 'decks',
  columns: [
    { name: 'title', storage: 'text', interpretation: 'plain', required: true },
    { name: 'pollIds', storage: 'text', interpretation: { kind: 'json' }, default: [] },
    { name: 'ownerId', storage: 'text', interpretation: 'plain', required: true, userBound: true, immutable: true },
  ],
  ownerField: 'ownerId',
  permissions: {
    viewer: { read: true, create: false, update: false, delete: false },
    member: { read: true, create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
