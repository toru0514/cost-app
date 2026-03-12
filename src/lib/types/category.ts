export type CategoryLarge = {
  id: string
  name: string
  description?: string
}

export type CategoryMedium = {
  id: string
  largeId: string
  name: string
  description?: string
}

export type CategorySmall = {
  id: string
  mediumId: string
  name: string
  description?: string
}
