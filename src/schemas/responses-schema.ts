import type { CollectionSchema } from 'deepspace/worker'

/**
 * One row per vote: the live aggregate source. Append-only per-vote rows are
 * conflict-free and fan out via RECORD_CHANGE, so every subscribed client
 * re-renders live (SPIKE-1). `viewer.create:true` is the anonymous-vote lever:
 * an unauthenticated WS connection (viewer role) may create a response.
 *
 * Answer is stored in the field matching the poll type: `optionId` (choice/
 * multi/ranking/quiz), `value` (scale/nps/numeric), or `text` (wordcloud/qa).
 * `deviceId` is the dedup key. No client delete; dedup + rate-limit are
 * enforced in the submitVote server action (kahoot submitAnswer pattern).
 */
export const responsesSchema: CollectionSchema = {
  name: 'responses',
  columns: [
    { name: 'sessionId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'pollId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'deviceId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'optionId', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'value', storage: 'number', interpretation: 'plain', default: 0 },
    { name: 'text', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'upvotes', storage: 'number', interpretation: 'plain', default: 0 },
    { name: 'approved', storage: 'number', interpretation: 'plain', default: 1 },
    { name: 'createdAt', storage: 'number', interpretation: 'plain', default: 0 },
    { name: 'displayName', storage: 'text', interpretation: 'plain', default: '' },
  ],
  permissions: {
    viewer: { read: true, create: true, update: false, delete: false },
    member: { read: true, create: true, update: 'own', delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
