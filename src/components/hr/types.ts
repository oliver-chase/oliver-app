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
  resumeLink: string
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
  serial: string
  status: string
  assignedTo: string
  purchaseDate: string
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
  createdAt: string
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

export interface HrDB {
  candidates: Candidate[]
  employees: Employee[]
  devices: Device[]
  assignments: Assignment[]
  tracks: Track[]
  onboardingRuns: OnboardingRun[]
  runTasks: RunTask[]
}

export type HrPage = 'dashboard' | 'hiring' | 'directory' | 'onboarding' | 'offboarding' | 'inventory' | 'assignments' | 'tracks' | 'reports' | 'settings'

export const STAGES = ['sourced', 'screening', 'interview', 'offer', 'hired']
