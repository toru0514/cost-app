export type AuditLogMetadata = {
  changes?: {
    products?: ChangeSummary
    materials?: ChangeSummary
    packaging?: ChangeSummary
    shippingMethods?: ChangeSummary
    laborRoles?: ChangeSummary
    equipments?: ChangeSummary
    optionPresets?: ChangeSummary
    fees?: ChangeSummary
    categoriesLarge?: ChangeSummary
    categoriesMedium?: ChangeSummary
    categoriesSmall?: ChangeSummary
  }
  client?: {
    userAgent?: string
    platform?: string
    language?: string
    location?: {
      host?: string
      pathname?: string
    }
  }
  payloadStats?: {
    categories: {
      large: number
      medium: number
      small: number
    }
    materials: number
    packaging: number
    shippingMethods: number
    laborRoles: number
    equipments: number
    optionPresets: number
    fees: number
    products: number
    costEntries: {
      materials: number
      packaging: number
      labor: number
      outsourcing: number
      development: number
      equipment: number
      logistics: number
      electricity: number
      fees: number
    }
    summary?: {
      totalCategories: number
      totalMasters: number
      totalCostEntries: number
      totalRecords: number
    }
  }
}

export type ChangeSummary = {
  added: string[]
  removed: string[]
  updated?: string[]
}

export type AuditFilters = {
  from?: string
  to?: string
}

export type AuditLog = {
  id: string
  userId: string
  createdAt: string
  deviceInfo?: string
  metadata?: AuditLogMetadata
}
