/*
 * "Add existing questions" picker for the poll detail screen. Lists every
 * question the creator owns that is not already in this poll, with search and
 * multi-select, and reports the picks in the order they were checked so the
 * caller can append them to the poll in that order.
 *
 * Membership is read from the polls each question already belongs to, never
 * from the question's own back-reference. Attaching shares the same question
 * with both polls; the footer switch turns that into independent copies.
 */

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { cn } from '../ui/utils'
import { TypeGlyph } from './TypeGlyph'
import { typeMeta } from './typeMeta'
import type { PollType } from '../../types'

/** How a picked question joins the poll. */
export type AttachMode = 'share' | 'copy'

/** One selectable question, already filtered to exclude this poll's members. */
export interface ExistingQuestion {
  id: string
  title: string
  type: PollType
  /** Titles of the other polls this question already sits in. */
  inPolls: string[]
}

interface AddExistingQuestionsProps {
  /** Name of the poll being added to, for the header. */
  pollName: string
  questions: ExistingQuestion[]
  busy?: boolean
  onAdd: (ids: string[], mode: AttachMode) => void
  onCancel: () => void
}

export function AddExistingQuestions({
  pollName,
  questions,
  busy,
  onAdd,
  onCancel,
}: AddExistingQuestionsProps) {
  const [query, setQuery] = useState('')
  // Selection order drives the order they land in the poll.
  const [picked, setPicked] = useState<string[]>([])
  const [mode, setMode] = useState<AttachMode>('share')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return questions
    return questions.filter(
      (x) => x.title.toLowerCase().includes(q) || typeMeta(x.type).name.toLowerCase().includes(q),
    )
  }, [questions, query])

  const sharedCount = picked.filter((id) => (questions.find((q) => q.id === id)?.inPolls.length ?? 0) > 0).length

  function toggle(id: string) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center p-6"
      style={{ background: 'rgba(12,16,22,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add existing questions"
        data-testid="add-existing-dialog"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(680px,88vh)] w-full max-w-[560px] flex-col overflow-hidden rounded-[20px] border border-border bg-bg-2 animate-tly-pop"
        style={{ boxShadow: '0 40px 120px -30px rgba(10,20,40,0.55)' }}
      >
        {/* Header + search */}
        <div className="flex-none px-6 pb-4 pt-[22px]">
          <p className="font-mono text-[10px] tracking-[0.14em] text-text-4">ADD EXISTING</p>
          <h2 className="mt-2 font-display text-[22px] font-extrabold tracking-[-0.02em] text-text-1">
            Add questions to {pollName}
          </h2>
          <p className="mt-1 text-[13px] text-text-3">
            Pick from the questions already in your library. They join at the end, in the order you pick them.
          </p>
          <div className="relative mt-3.5">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-4" aria-hidden />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your questions"
              aria-label="Search your questions"
              data-testid="add-existing-search"
              className="w-full rounded-[10px] border border-border-3 bg-bg-1 py-2.5 pl-9 pr-3 text-[14px] text-text-1 outline-none transition-colors placeholder:text-text-4 focus:border-accent"
            />
          </div>
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">
          {questions.length === 0 ? (
            <p className="rounded-[12px] border border-dashed border-border-4 px-5 py-9 text-center text-[13.5px] text-text-3">
              Every question in your library is already in this poll. Create a new one instead.
            </p>
          ) : visible.length === 0 ? (
            <p className="rounded-[12px] border border-dashed border-border-4 px-5 py-9 text-center text-[13.5px] text-text-3">
              No question matches that search.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {visible.map((q) => (
                <QuestionRow key={q.id} question={q} checked={picked.includes(q.id)} onToggle={() => toggle(q.id)} />
              ))}
            </ul>
          )}
        </div>

        {/* Footer: share-or-copy choice + actions */}
        <div className="flex-none border-t border-border bg-bg-subtle px-6 py-4">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={mode === 'copy'}
              onChange={(e) => setMode(e.target.checked ? 'copy' : 'share')}
              data-testid="add-existing-copy"
              className="mt-0.5 h-4 w-4 flex-none accent-[var(--accent)]"
            />
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold text-text-1">Add copies instead</span>
              <span className="block text-[12px] leading-[1.45] text-text-3">
                {mode === 'copy'
                  ? 'Each pick joins as its own question. Editing it here leaves the original alone.'
                  : sharedCount > 0
                    ? `${sharedCount} of your picks also live in another poll. Editing one edits it everywhere.`
                    : 'Picks join as the same question. Put one in two polls and editing it changes both.'}
              </span>
            </span>
          </label>

          <div className="mt-3.5 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-[10px] border border-border-4 bg-bg-2 px-4 py-2.5 text-[14px] font-semibold text-text-2 transition-colors hover:border-border-7 hover:text-text-1"
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="add-existing-confirm"
              disabled={picked.length === 0 || busy}
              onClick={() => onAdd(picked, mode)}
              className="ml-auto rounded-[10px] bg-accent px-[22px] py-2.5 text-[14px] font-bold text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {busy
                ? 'Adding…'
                : picked.length === 0
                  ? 'Add questions'
                  : `Add ${picked.length} ${picked.length === 1 ? 'question' : 'questions'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* One pickable row: checkbox + type glyph + question + type/membership meta. */
function QuestionRow({
  question,
  checked,
  onToggle,
}: {
  question: ExistingQuestion
  checked: boolean
  onToggle: () => void
}) {
  const meta = typeMeta(question.type)
  const where = question.inPolls.length
    ? `Also in ${question.inPolls.slice(0, 2).join(', ')}${question.inPolls.length > 2 ? ` +${question.inPolls.length - 2}` : ''}`
    : 'Not in a poll yet'
  return (
    <li>
      <label
        className={cn(
          'flex cursor-pointer items-center gap-3 rounded-[12px] border px-3.5 py-3 transition-colors',
          checked ? 'border-accent bg-accent-tint-2' : 'border-border bg-bg-2 hover:border-border-6',
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="h-4 w-4 flex-none accent-[var(--accent)]"
        />
        <TypeGlyph type={question.type} size="lg" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-semibold text-text-1">
            {question.title || 'Untitled question'}
          </span>
          <span className="block truncate text-[12px] text-text-3">
            {meta.name} · {where}
          </span>
        </span>
      </label>
    </li>
  )
}
