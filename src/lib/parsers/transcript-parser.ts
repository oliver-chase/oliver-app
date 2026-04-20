// Client-side transcript parser for plain text meeting transcripts.
// Produces the same schema as /api/parse-document so confirm-write can accept it directly.
// Works for .txt files. For .docx/.pdf, fall back to the API.

export interface TranscriptMetadata {
  title: string | null
  date: string | null
  attendees: string[]
}

export interface TranscriptNote {
  topic: string
  content: string
  speaker: string | null
}

export interface TranscriptDecision {
  decision: string
  context: string | null
}

export interface TranscriptAction {
  task: string
  owner: string | null
  due: string | null
}

export interface TranscriptPerson {
  name: string
  role: string | null
  department: string | null
  sentiment: string | null
}

export interface ParsedTranscript {
  metadata: TranscriptMetadata
  notes: TranscriptNote[]
  decisions: TranscriptDecision[]
  actions: TranscriptAction[]
  updates: {
    people: TranscriptPerson[]
    projects: unknown[]
    opportunities: unknown[]
    org: unknown[]
  }
  gaps: string[]
}

// Patterns that suggest action ownership
const ACTION_PATTERNS = [
  /\b(\w+(?:\s+\w+)?)\s+will\s+(.+)/i,
  /\baction(?:\s*item)?[:\s]+(.+)/i,
  /\btodo[:\s]+(.+)/i,
  /\bfollow(?:\s*up)[:\s]+(.+)/i,
  /\b@(\w+)\s+(.+)/i,
  /\b(\w+(?:\s+\w+)?)\s+(?:is|are)\s+going\s+to\s+(.+)/i,
  /\bcan\s+(?:you\s+)?(\w+(?:\s+\w+)?)\s+(.+)/i,
]

const DECISION_PATTERNS = [
  /\bwe\s+(?:decided|agreed|confirmed)\s+(?:to\s+)?(.+)/i,
  /\b(?:decision|agreed)[:\s]+(.+)/i,
  /\bgoing\s+(?:with|forward\s+with)\s+(.+)/i,
]

const DATE_PATTERNS = [
  /\b(\d{4}-\d{2}-\d{2})\b/,
  /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/,
  /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{1,2},?\s+\d{4})\b/i,
  /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{4})\b/i,
]

// Detects "Speaker: text" or "Speaker (timestamp): text" patterns
function parseSpeakerLine(line: string): { speaker: string; text: string } | null {
  // HH:MM:SS format with optional name: "00:01:23 Speaker: text"
  const withTimestamp = line.match(/^(?:\[?(?:\d{1,2}:)?\d{2}:\d{2}(?:\.\d+)?\]?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*[:(]\s*(.+)/)
  if (withTimestamp && withTimestamp[2].length > 2) {
    return { speaker: withTimestamp[1].trim(), text: withTimestamp[2].trim() }
  }
  return null
}

function extractDate(text: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const m = text.match(pattern)
    if (m) return m[1]
  }
  return null
}

function extractTitle(lines: string[]): string | null {
  for (const line of lines.slice(0, 10)) {
    const clean = line.trim()
    if (!clean) continue
    const lower = clean.toLowerCase()
    if (lower.startsWith('re:') || lower.startsWith('subject:') || lower.startsWith('meeting:') || lower.startsWith('call:')) {
      return clean.replace(/^(?:re|subject|meeting|call):\s*/i, '').trim()
    }
    // First non-empty, non-timestamp line that isn't too long is probably the title
    if (clean.length < 120 && !/^\d{1,2}:\d{2}/.test(clean) && !/^[a-z]/.test(clean)) {
      return clean
    }
  }
  return null
}

function groupIntoTopics(speakerSegments: Array<{ speaker: string; text: string }>): TranscriptNote[] {
  if (!speakerSegments.length) return []
  const notes: TranscriptNote[] = []
  let currentTopic = ''
  let currentLines: string[] = []
  let currentSpeaker: string | null = null

  for (const seg of speakerSegments) {
    // New topic when speaker changes or after a blank (already filtered)
    if (seg.speaker !== currentSpeaker && currentLines.length) {
      notes.push({ topic: currentTopic || 'Discussion', content: currentLines.join(' '), speaker: currentSpeaker })
      currentLines = []
      currentTopic = ''
    }
    currentSpeaker = seg.speaker
    currentLines.push(seg.text)
    currentTopic = currentTopic || seg.text.slice(0, 60)
  }
  if (currentLines.length) {
    notes.push({ topic: currentTopic || 'Discussion', content: currentLines.join(' '), speaker: currentSpeaker })
  }
  return notes
}

export function parseTranscript(text: string): ParsedTranscript {
  const lines = text.split(/\r?\n/)
  const gaps: string[] = []

  const title = extractTitle(lines)
  const date = extractDate(text)
  if (!date) gaps.push('meeting date')

  const speakerSegments: Array<{ speaker: string; text: string }> = []
  const actions: TranscriptAction[] = []
  const decisions: TranscriptDecision[] = []
  const attendeeSet = new Set<string>()

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const parsed = parseSpeakerLine(trimmed)
    if (parsed) {
      speakerSegments.push(parsed)
      attendeeSet.add(parsed.speaker)

      // Check for action items within this line
      for (const pattern of ACTION_PATTERNS) {
        const m = parsed.text.match(pattern)
        if (m) {
          const task = m[2] || m[1] || parsed.text
          const owner = m[1] && m[2] ? m[1] : parsed.speaker
          if (task.length > 5 && task.length < 200) {
            actions.push({ task: task.trim(), owner: owner || null, due: null })
          }
          break
        }
      }

      // Check for decisions
      for (const pattern of DECISION_PATTERNS) {
        const m = parsed.text.match(pattern)
        if (m && m[1].length > 5) {
          decisions.push({ decision: m[1].trim(), context: null })
          break
        }
      }
    } else {
      // Non-speaker line: check for standalone action/decision patterns
      for (const pattern of ACTION_PATTERNS) {
        const m = trimmed.match(pattern)
        if (m) {
          const task = m[2] || m[1] || trimmed
          if (task.length > 5 && task.length < 200) {
            actions.push({ task: task.trim(), owner: m[1] && m[2] ? m[1] : null, due: null })
          }
          break
        }
      }
    }
  }

  const notes = groupIntoTopics(speakerSegments)

  if (!notes.length && !actions.length) {
    gaps.push('meeting content (no speaker pattern detected — format as "Speaker: text")')
  }
  if (!attendeeSet.size) gaps.push('attendees')

  return {
    metadata: {
      title: title || null,
      date,
      attendees: Array.from(attendeeSet),
    },
    notes,
    decisions,
    actions,
    updates: { people: [], projects: [], opportunities: [], org: [] },
    gaps,
  }
}
