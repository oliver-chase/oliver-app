export type Role = 'admin' | 'user'

export type PagePermission = 'accounts' | 'hr' | 'sdr' | 'crm'

export interface AppUser {
  user_id: string
  email: string
  name: string
  role: Role
  page_permissions: PagePermission[]
  created_at: string
  updated_at: string
  security_q1?: string | null
  security_a1?: string | null
  security_q2?: string | null
  security_a2?: string | null
  security_q3?: string | null
  security_a3?: string | null
}
