import type { CollectionSchema } from 'deepspace/worker'

/**
 * A live run of a poll or deck: the thing voters join. Carries the join code,
 * state, the current poll pointer, and reveal/lock flags. Mirrors kahoot's
 * `games` record (kahoot/src/schemas/games-schema.ts). Public read so the join
 * and presenter flows work anonymously; only the host (ownerField) mutates.
 */
export const sessionsSchema: CollectionSchema = {
  name: 'sessions',
  columns: [
    { name: 'code', storage: 'text', interpretation: 'plain', required: true },
    { name: 'pollId', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'deckId', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'name', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'state', storage: 'text', interpretation: { kind: 'select', options: ['lobby', 'live', 'closed'] }, default: 'lobby' },
    { name: 'currentPollId', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'resultsRevealed', storage: 'number', interpretation: 'plain', default: 0 },
    { name: 'locked', storage: 'number', interpretation: 'plain', default: 0 },
    { name: 'hostId', storage: 'text', interpretation: 'plain', required: true, userBound: true, immutable: true },
    { name: 'startedAt', storage: 'number', interpretation: 'plain', default: 0 },
    { name: 'closedAt', storage: 'number', interpretation: 'plain', default: 0 },
    { name: 'askNames', storage: 'number', interpretation: 'plain', default: 0 },
    { name: 'moderateQa', storage: 'number', interpretation: 'plain', default: 0 },
    { name: 'pollStartedAt', storage: 'number', interpretation: 'plain', default: 0 },
  ],
  ownerField: 'hostId',
  permissions: {
    viewer: { read: true, create: false, update: false, delete: false },
    member: { read: true, create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
