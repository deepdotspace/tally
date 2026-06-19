/**
 * Collection Schemas
 *
 * All collections with columns and RBAC permissions.
 * Single source of truth — imported by both worker and frontend.
 *
 * Add schemas by creating a file in src/schemas/ and importing it here.
 */

import type { CollectionSchema } from 'deepspace/worker'
import { usersSchema } from './schemas/users-schema'
import { settingsSchema } from './schemas/admin-schema'
import { pollsSchema } from './schemas/polls-schema'
import { sessionsSchema } from './schemas/sessions-schema'
import { responsesSchema } from './schemas/responses-schema'
import { decksSchema } from './schemas/decks-schema'
import { upvotesSchema } from './schemas/upvotes-schema'

export const schemas: CollectionSchema[] = [
  usersSchema,
  settingsSchema,
  pollsSchema,
  sessionsSchema,
  responsesSchema,
  decksSchema,
  upvotesSchema,
]
