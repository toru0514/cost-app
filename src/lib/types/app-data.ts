import type { CategoryLarge, CategoryMedium, CategorySmall } from "./category"
import type { Material, MaterialCostEntry } from "./material"
import type { PackagingItem, PackagingCostEntry } from "./packaging"
import type { ShippingMethod, LogisticsCostEntry } from "./shipping"
import type { LaborRole, LaborCostEntry } from "./labor"
import type { Equipment, EquipmentAllocationEntry } from "./equipment"
import type { Fee, FeeCostEntry } from "./fee"
import type { Product, OptionPreset } from "./product"
import type { OutsourcingCostEntry, DevelopmentCostEntry, ElectricityCostEntry } from "./cost-entry"
import type { TimeRecord } from "./time-record"
import type { ProcessTemplate, ProductProcess } from "./process"

export type AppData = {
  categories: {
    large: CategoryLarge[]
    medium: CategoryMedium[]
    small: CategorySmall[]
  }
  materials: Material[]
  packagingItems: PackagingItem[]
  shippingMethods: ShippingMethod[]
  laborRoles: LaborRole[]
  equipments: Equipment[]
  fees: Fee[]
  optionPresets: OptionPreset[]
  products: Product[]
  timeRecords: TimeRecord[]
  processTemplates: ProcessTemplate[]
  productProcesses: ProductProcess[]
  costEntries: {
    materials: MaterialCostEntry[]
    packaging: PackagingCostEntry[]
    labor: LaborCostEntry[]
    outsourcing: OutsourcingCostEntry[]
    development: DevelopmentCostEntry[]
    equipmentAllocations: EquipmentAllocationEntry[]
    logistics: LogisticsCostEntry[]
    electricity: ElectricityCostEntry[]
    fees: FeeCostEntry[]
  }
}

export const emptyAppData: AppData = {
  categories: {
    large: [],
    medium: [],
    small: [],
  },
  materials: [],
  packagingItems: [],
  shippingMethods: [],
  laborRoles: [],
  equipments: [],
  fees: [],
  optionPresets: [],
  products: [],
  timeRecords: [],
  processTemplates: [],
  productProcesses: [],
  costEntries: {
    materials: [],
    packaging: [],
    labor: [],
    outsourcing: [],
    development: [],
    equipmentAllocations: [],
    logistics: [],
    electricity: [],
    fees: [],
  },
}
