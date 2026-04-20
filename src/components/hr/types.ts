export interface Candidate {
  id: string
  name: string
  role: string
  seniority: string
  dept: string
  source: string
  stage: string
  candStatus: string
  empType: string
  compType: string
  compAmount: string
  city: string
  state: string
  country: string
  client: string
  email: string
  resumeLink: string
  skills: string
  addedAt: string
  updatedAt: string
  notes: string
  rejectionReason: string
  offerAmount: string
  offerDate: string
  offerStatus: string
}

export interface Employee {
  id: string
  name: string
  role: string
  dept: string
  status: string
  client: string
  location: string
  city: string
  state: string
  country: string
  manager: string
  buddy: string
  startDate: string
  endDate: string
  email: string
  source: string
  created_at: string
  updated_at: string
}

export interface Device {
  id: string
  name: string
  make: string
  type: string
  model: string
  modelNumber: string
  serial: string
  status: string
  assignedTo: string
  condition: string
  purchaseDate: string
  purchaseStore: string
  orderNumber: string
  specs: string
  location: string
  notes: string
  created_at: string
  updated_at: string
}

export interface Assignment {
  id: string
  employeeId: string
  deviceId: string
  assignedAt: string
  status: string
  returnedAt: string
  created_at: string
}

export interface Track {
  id: string
  name: string
  type: string
  description: string
  autoApply: string | boolean
  createdAt: string
  updated_at: string
}

export interface TrackTask {
  id: string
  trackId: string
  name: string
  ownerRole: string
  dueDaysOffset: string
  order: number
  created_at: string
  updated_at: string
}

export interface OnboardingRun {
  id: string
  employeeId: string
  trackId: string
  type: string
  status: string
  startDate: string
  created_at: string
}

export interface RunTask {
  id: string
  runId: string
  name: string
  ownerRole: string
  status: string
  dueDate: string
  created_at: string
  updated_at: string
}

export interface Interview {
  id: string
  candidateId: string
  date: string
  interviewers: string
  notes: string
  score: string
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string
  type: string
  desc: string
  at: string
}

export interface HrList {
  id: string
  listKey: string
  value: string
  order: string
  created_at: string
  updated_at: string
}

export interface HrDB {
  candidates: Candidate[]
  employees: Employee[]
  devices: Device[]
  assignments: Assignment[]
  tracks: Track[]
  tasks: TrackTask[]
  onboardingRuns: OnboardingRun[]
  runTasks: RunTask[]
  interviews: Interview[]
  activities: Activity[]
  lists: HrList[]
}

export type HrPage = 'dashboard' | 'hiring' | 'directory' | 'onboarding' | 'offboarding' | 'inventory' | 'assignments' | 'tracks' | 'reports' | 'settings'

export const STAGES = ['sourced', 'screening', 'interview', 'offer', 'hired'] as const

export const DEFAULT_LISTS: Record<string, string[]> = {
  candStatus: ['Active', 'On Hold', 'Nurturing', 'Hired', 'Closed'],
  empType: ['Full-time', 'Part-time', 'Contract', 'Intern'],
  source: ['Referral', 'LinkedIn', 'Job Board', 'Outreach', 'Agency'],
  seniority: ['Junior', 'Mid', 'Senior', 'Staff', 'Principal', 'Director'],
  dept: ['Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'Operations', 'Finance', 'HR'],
  deviceType: ['laptop', 'monitor', 'phone', 'keyboard', 'mouse', 'headset', 'other'],
  interviewScore: ['Strong Yes', 'Yes', 'Neutral', 'No', 'Strong No'],
}

export function getList(lists: HrList[], key: string): string[] {
  const vals = lists.filter(l => l.listKey === key).sort((a, b) => parseInt(a.order, 10) - parseInt(b.order, 10)).map(l => l.value)
  return vals.length ? vals : (DEFAULT_LISTS[key] || [])
}
