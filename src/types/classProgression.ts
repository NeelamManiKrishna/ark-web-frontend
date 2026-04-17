export interface ClassLevel {
  className: string
  displayOrder: number
  isTerminal: boolean
}

export interface ClassProgressionRequest {
  sequence: ClassLevel[]
}

export interface ClassProgressionResponse {
  id: string
  organizationId: string
  branchId: string
  sequence: ClassLevel[]
  createdAt: string
  updatedAt: string
}
