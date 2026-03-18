export type ProcessTemplate = {
  id: string
  parentId?: string
  name: string
  defaultHourlyRate: number
  color?: string
  icon?: string
  sortOrder: number
}

export type ProductProcess = {
  id: string
  productId: string
  parentId?: string
  processTemplateId?: string
  name: string
  hourlyRate: number
  estimatedMinutes?: number
  sortOrder: number
}
