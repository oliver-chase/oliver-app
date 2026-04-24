export interface ParsedCandidateIntake {
  name: string
  role: string
  seniority: string
  dept: string
  city: string
  state: string
  email: string
  source: string
}

function detectDelimiter(line: string) {
  const candidates = [
    { delimiter: ',', count: line.split(',').length },
    { delimiter: '\t', count: line.split('\t').length },
    { delimiter: ';', count: line.split(';').length },
  ].sort((a, b) => b.count - a.count)
  return candidates[0]?.count > 1 ? candidates[0].delimiter : ','
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function getFieldIndex(headers: string[], aliases: string[]) {
  const normalized = headers.map(normalizeHeader)
  return normalized.findIndex(header => aliases.includes(header))
}

export function parseCandidateIntakeText(text: string): ParsedCandidateIntake[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const lines = trimmed
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return []

  const delimiter = detectDelimiter(lines[0])
  const headers = lines[0].split(delimiter).map(cell => cell.trim())

  const nameIndex = getFieldIndex(headers, ['name', 'fullname', 'candidate', 'candidatename'])
  if (nameIndex === -1) {
    return lines
      .map(line => ({
        name: line,
        role: '',
        seniority: '',
        dept: '',
        city: '',
        state: '',
        email: '',
        source: 'Candidate Intake',
      }))
      .filter(row => row.name)
  }

  const roleIndex = getFieldIndex(headers, ['role', 'title', 'position'])
  const seniorityIndex = getFieldIndex(headers, ['seniority', 'level'])
  const deptIndex = getFieldIndex(headers, ['dept', 'department', 'team'])
  const cityIndex = getFieldIndex(headers, ['city'])
  const stateIndex = getFieldIndex(headers, ['state', 'province', 'region'])
  const emailIndex = getFieldIndex(headers, ['email', 'emailaddress'])
  const sourceIndex = getFieldIndex(headers, ['source', 'channel'])

  return lines
    .slice(1)
    .map(line => {
      const cells = line.split(delimiter).map(cell => cell.trim())
      return {
        name: cells[nameIndex] || '',
        role: roleIndex >= 0 ? cells[roleIndex] || '' : '',
        seniority: seniorityIndex >= 0 ? cells[seniorityIndex] || '' : '',
        dept: deptIndex >= 0 ? cells[deptIndex] || '' : '',
        city: cityIndex >= 0 ? cells[cityIndex] || '' : '',
        state: stateIndex >= 0 ? cells[stateIndex] || '' : '',
        email: emailIndex >= 0 ? cells[emailIndex] || '' : '',
        source: sourceIndex >= 0 ? cells[sourceIndex] || 'Candidate Intake' : 'Candidate Intake',
      }
    })
    .filter(row => row.name)
}

export async function xlsxToCsv(file: File): Promise<string> {
  const xlsx = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const workbook = xlsx.read(buffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) throw new Error('Workbook has no sheets')
  const sheet = workbook.Sheets[firstSheetName]
  return xlsx.utils.sheet_to_csv(sheet)
}
