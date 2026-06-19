import type { CollectionSchema } from 'deepspace/worker'

/**
 * One row per Q&A upvote (SPEC §7 S2 headline). Append-only, mirrors
 * `responses`: anonymous voters are `viewer` and cannot update a row, so an
 * upvote is a new row, not an increment on the question. `viewer.create:true`
 * is the anonymous-upvote lever; counting + one-per-device dedup are
 * client-side (useUpvote). `responseId` is the upvoted Q&A question row.
 */
export const upvotesSchema: CollectionSchema = {
  name: 'upvotes',
  columns: [
    { name: 'sessionId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'pollId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'responseId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'deviceId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'createdAt', storage: 'number', interpretation: 'plain', default: 0 },
  ],
  permissions: {
    viewer: { read: true, create: true, update: false, delete: false },
    member: { read: true, create: true, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
