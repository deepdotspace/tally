// Generouted, changes to this file will be overridden
/* eslint-disable */

import { components, hooks, utils } from '@generouted/react-router/client'

export type Path =
  | `*`
  | `/`
  | `/build`
  | `/dashboard`
  | `/deck/:id`
  | `/decks`
  | `/history`
  | `/home`
  | `/join`
  | `/library`
  | `/present/:code`
  | `/r/:code`
  | `/session/:id`
  | `/settings`
  | `/v/:code`
  | `/voice`

export type Params = {
  '/*': { '*': string }
  '/deck/:id': { id: string }
  '/present/:code': { code: string }
  '/r/:code': { code: string }
  '/session/:id': { id: string }
  '/v/:code': { code: string }
}

export type ModalPath = never

export const { Link, Navigate } = components<Path, Params>()
export const { useModals, useNavigate, useParams } = hooks<Path, Params, ModalPath>()
export const { redirect } = utils<Path, Params>()
