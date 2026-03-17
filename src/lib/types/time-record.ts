export type TimeRecordLap = {
  id: string
  label: string
  duration: number
}

export type TimeRecord = {
  id: string
  taskName: string
  totalDuration: number
  laps: TimeRecordLap[]
  note?: string
  createdAt: string
  updatedAt: string
}
