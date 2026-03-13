import type { AppData, ProductSizeVariant } from "../types"
import type {
  BulkSyncEntity,
  BulkSyncPayload,
  NormalizedPayload,
  NormalizedRecord,
  ValidationIssue,
} from "./types"

const entities: BulkSyncEntity[] = [
  "categories_large",
  "categories_medium",
  "categories_small",
  "materials",
  "packaging_items",
  "shipping_methods",
  "labor_roles",
  "equipments",
  "fees",
  "option_presets",
  "products",
]

const emptyNormalizedPayload = (): NormalizedPayload =>
  entities.reduce(
    (acc, entity) => {
      acc[entity] = []
      return acc
    },
    {} as NormalizedPayload
  )

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "")

const asOptionalString = (value: unknown) => {
  const trimmed = asString(value)
  return trimmed.length > 0 ? trimmed : undefined
}

const asBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "true") return true
    if (normalized === "false") return false
  }
  return false
}

const asNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return undefined
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return NaN
}

const addIssue = (
  issues: ValidationIssue[],
  entity: BulkSyncEntity,
  key: string,
  message: string,
  field?: string,
  severity: "error" | "warning" = "error"
) => {
  issues.push({ entity, key, field, message, severity })
}

const buildKey = (id?: string, naturalKey?: string) => {
  if (id) return id
  return naturalKey ?? "(unknown)"
}

const parseVariants = (
  value: unknown,
  issues: ValidationIssue[],
  entity: BulkSyncEntity,
  key: string,
  field: string
): ProductSizeVariant[] => {
  if (value === null || value === undefined || value === "") return []

  const parsed: ProductSizeVariant[] = []

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return []

    if (trimmed.startsWith("[")) {
      try {
        const json = JSON.parse(trimmed)
        if (Array.isArray(json)) {
          json.forEach((entry) => {
            if (entry && typeof entry === "object") {
              const label = asString((entry as { label?: unknown }).label)
              const quantity = asNumber((entry as { quantity?: unknown }).quantity)
              if (!label) {
                addIssue(issues, entity, key, "label が空のサイズ定義があります", field)
                return
              }
              if (!Number.isFinite(quantity)) {
                addIssue(issues, entity, key, `quantity が数値ではありません: ${label}`, field)
                return
              }
              parsed.push({ label, quantity: quantity as number })
            }
          })
          return parsed
        }
      } catch (error) {
        addIssue(issues, entity, key, "JSON の解析に失敗しました", field)
        return []
      }
    }

    const segments = trimmed.split("|").map((segment) => segment.trim())
    segments.forEach((segment) => {
      if (!segment) return
      const [labelRaw, quantityRaw] = segment.split(":")
      const label = asString(labelRaw)
      const quantity = asNumber(quantityRaw)
      if (!label) {
        addIssue(issues, entity, key, "label が空のサイズ定義があります", field)
        return
      }
      if (!Number.isFinite(quantity)) {
        addIssue(issues, entity, key, `quantity が数値ではありません: ${label}`, field)
        return
      }
      parsed.push({ label, quantity: quantity as number })
    })
    return parsed
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => {
      if (entry && typeof entry === "object") {
        const label = asString((entry as { label?: unknown }).label)
        const quantity = asNumber((entry as { quantity?: unknown }).quantity)
        if (!label) {
          addIssue(issues, entity, key, "label が空のサイズ定義があります", field)
          return
        }
        if (!Number.isFinite(quantity)) {
          addIssue(issues, entity, key, `quantity が数値ではありません: ${label}`, field)
          return
        }
        parsed.push({ label, quantity: quantity as number })
      }
    })
    return parsed
  }

  addIssue(issues, entity, key, "サイズ定義の形式が不正です", field)
  return []
}

type CategoryMaps = {
  largeById: Map<string, string>
  largeByName: Map<string, string>
  mediumById: Map<string, { name: string; largeId: string }>
  mediumByName: Map<string, { id: string; largeId: string }>
  equipmentByName: Map<string, string>
}

const buildCategoryMaps = (payload: NormalizedPayload, existing: AppData) => {
  const largeById = new Map<string, string>()
  const largeByName = new Map<string, string>()
  existing.categories.large.forEach((item) => {
    largeById.set(item.id, item.name)
    largeByName.set(item.name, item.id)
  })
  payload.categories_large.forEach((record) => {
    const name = asString(record.data.name)
    if (record.id) {
      largeById.set(record.id, name)
      if (name) largeByName.set(name, record.id)
    }
  })

  const mediumById = new Map<string, { name: string; largeId: string }>()
  const mediumByName = new Map<string, { id: string; largeId: string }>()
  existing.categories.medium.forEach((item) => {
    mediumById.set(item.id, { name: item.name, largeId: item.largeId })
    mediumByName.set(`${item.largeId}::${item.name}`, { id: item.id, largeId: item.largeId })
  })
  payload.categories_medium.forEach((record) => {
    const name = asString(record.data.name)
    const largeId = asString(record.data.large_id)
    if (record.id && name && largeId) {
      mediumById.set(record.id, { name, largeId })
      mediumByName.set(`${largeId}::${name}`, { id: record.id, largeId })
    }
  })

  const equipmentByName = new Map<string, string>()
  existing.equipments.forEach((item) => equipmentByName.set(item.name, item.id))
  payload.equipments.forEach((record) => {
    const name = asString(record.data.name)
    if (name && record.id) equipmentByName.set(name, record.id)
  })

  return { largeById, largeByName, mediumById, mediumByName, equipmentByName } satisfies CategoryMaps
}

const ensureArray = (value: unknown) => (Array.isArray(value) ? value : [])

export const validateBulkSyncPayload = (payload: BulkSyncPayload, existing: AppData) => {
  const issues: ValidationIssue[] = []
  const normalized = emptyNormalizedPayload()

  const pushRecord = (record: NormalizedRecord) => {
    normalized[record.entity].push(record)
  }

  const handleDuplicateKeys = () => {
    entities.forEach((entity) => {
      const seen = new Map<string, number>()
      normalized[entity].forEach((record) => {
        const key = record.naturalKey
        if (!key) return
        const count = seen.get(key) ?? 0
        seen.set(key, count + 1)
      })
      normalized[entity].forEach((record) => {
        const count = seen.get(record.naturalKey) ?? 0
        if (count > 1) {
          addIssue(issues, entity, buildKey(record.id, record.naturalKey), "自然キーが重複しています")
        }
      })
    })
  }

  ensureArray(payload.categories_large).forEach((item, index) => {
    const name = asString(item.name)
    const id = asOptionalString(item.id)
    const naturalKey = name
    const key = buildKey(id, naturalKey)
    const isDeleted = asBoolean(item.is_deleted)

    if (!isDeleted && !name) {
      addIssue(issues, "categories_large", key, "name は必須です", "name")
    }

    pushRecord({
      entity: "categories_large",
      id,
      naturalKey,
      isDeleted,
      data: {
        name,
        description: asOptionalString(item.description),
      },
      rowIndex: index,
    })
  })

  ensureArray(payload.categories_medium).forEach((item, index) => {
    const name = asString(item.name)
    const id = asOptionalString(item.id)
    const largeId = asOptionalString(item.large_id)
    const largeName = asOptionalString(item.large_name)
    const naturalKey = `${largeName ?? largeId ?? ""}::${name}`
    const key = buildKey(id, naturalKey)
    const isDeleted = asBoolean(item.is_deleted)

    if (!isDeleted && !name) {
      addIssue(issues, "categories_medium", key, "name は必須です", "name")
    }
    if (!isDeleted && !largeId && !largeName) {
      addIssue(issues, "categories_medium", key, "large_id または large_name が必要です", "large_id")
    }

    pushRecord({
      entity: "categories_medium",
      id,
      naturalKey,
      isDeleted,
      data: {
        name,
        large_id: largeId ?? largeName,
        large_name: largeName,
        description: asOptionalString(item.description),
      },
      rowIndex: index,
    })
  })

  ensureArray(payload.categories_small).forEach((item, index) => {
    const name = asString(item.name)
    const id = asOptionalString(item.id)
    const mediumId = asOptionalString(item.medium_id)
    const largeName = asOptionalString(item.large_name)
    const mediumName = asOptionalString(item.medium_name)
    const naturalKey = `${largeName ?? ""}::${mediumName ?? mediumId ?? ""}::${name}`
    const key = buildKey(id, naturalKey)
    const isDeleted = asBoolean(item.is_deleted)

    if (!isDeleted && !name) {
      addIssue(issues, "categories_small", key, "name は必須です", "name")
    }
    if (!isDeleted && !mediumId && !mediumName) {
      addIssue(issues, "categories_small", key, "medium_id または medium_name が必要です", "medium_id")
    }

    pushRecord({
      entity: "categories_small",
      id,
      naturalKey,
      isDeleted,
      data: {
        name,
        medium_id: mediumId ?? mediumName,
        large_name: largeName,
        medium_name: mediumName,
        description: asOptionalString(item.description),
      },
      rowIndex: index,
    })
  })

  ensureArray(payload.materials).forEach((item, index) => {
    const name = asString(item.name)
    const supplier = asOptionalString(item.supplier)
    const id = asOptionalString(item.id)
    const naturalKey = supplier ? `${name}::${supplier}` : name
    const key = buildKey(id, naturalKey)
    const isDeleted = asBoolean(item.is_deleted)

    if (!isDeleted && !name) {
      addIssue(issues, "materials", key, "name は必須です", "name")
    }

    const unitCost = asNumber(item.unit_cost)
    if (!isDeleted && item.unit_cost !== undefined && Number.isNaN(unitCost)) {
      addIssue(issues, "materials", key, "unit_cost は数値で入力してください", "unit_cost")
    }

    const unitsPerBatch = asNumber(item.units_per_batch)
    if (!isDeleted && item.units_per_batch !== undefined && Number.isNaN(unitsPerBatch)) {
      addIssue(issues, "materials", key, "units_per_batch は数値で入力してください", "units_per_batch")
    }

    const materialStock = asNumber(item.stock)
    const materialStockUnit = asOptionalString(item.stock_unit)
    const usePercentageMode = asBoolean(item.use_percentage_mode)

    pushRecord({
      entity: "materials",
      id,
      naturalKey,
      isDeleted,
      data: {
        name,
        unit: asOptionalString(item.unit),
        size_description: asOptionalString(item.size_description),
        currency: asOptionalString(item.currency) ?? "JPY",
        unit_cost: Number.isFinite(unitCost) ? unitCost : undefined,
        units_per_batch: Number.isFinite(unitsPerBatch) ? unitsPerBatch : undefined,
        use_percentage_mode: usePercentageMode,
        supplier,
        note: asOptionalString(item.note),
        image_url: asOptionalString(item.image_url),
        stock: Number.isFinite(materialStock) ? materialStock : undefined,
        stock_unit: materialStockUnit,
      },
      rowIndex: index,
    })
  })

  ensureArray(payload.packaging_items).forEach((item, index) => {
    const name = asString(item.name)
    const id = asOptionalString(item.id)
    const naturalKey = name
    const key = buildKey(id, naturalKey)
    const isDeleted = asBoolean(item.is_deleted)

    if (!isDeleted && !name) {
      addIssue(issues, "packaging_items", key, "name は必須です", "name")
    }

    const unitCost = asNumber(item.unit_cost)
    if (!isDeleted && item.unit_cost !== undefined && Number.isNaN(unitCost)) {
      addIssue(issues, "packaging_items", key, "unit_cost は数値で入力してください", "unit_cost")
    }

    const unitsPerBatch = asNumber(item.units_per_batch)
    if (!isDeleted && item.units_per_batch !== undefined && Number.isNaN(unitsPerBatch)) {
      addIssue(issues, "packaging_items", key, "units_per_batch は数値で入力してください", "units_per_batch")
    }

    const packagingStock = asNumber(item.stock)
    const packagingStockUnit = asOptionalString(item.stock_unit)

    pushRecord({
      entity: "packaging_items",
      id,
      naturalKey,
      isDeleted,
      data: {
        name,
        unit: asOptionalString(item.unit),
        size_description: asOptionalString(item.size_description),
        currency: asOptionalString(item.currency) ?? "JPY",
        unit_cost: Number.isFinite(unitCost) ? unitCost : undefined,
        units_per_batch: Number.isFinite(unitsPerBatch) ? unitsPerBatch : undefined,
        note: asOptionalString(item.note),
        stock: Number.isFinite(packagingStock) ? packagingStock : undefined,
        stock_unit: packagingStockUnit,
      },
      rowIndex: index,
    })
  })

  ensureArray(payload.shipping_methods).forEach((item, index) => {
    const name = asString(item.name)
    const id = asOptionalString(item.id)
    const naturalKey = name
    const key = buildKey(id, naturalKey)
    const isDeleted = asBoolean(item.is_deleted)

    if (!isDeleted && !name) {
      addIssue(issues, "shipping_methods", key, "name は必須です", "name")
    }

    const unitCost = asNumber(item.unit_cost)
    if (!isDeleted && item.unit_cost !== undefined && Number.isNaN(unitCost)) {
      addIssue(issues, "shipping_methods", key, "unit_cost は数値で入力してください", "unit_cost")
    }

    pushRecord({
      entity: "shipping_methods",
      id,
      naturalKey,
      isDeleted,
      data: {
        name,
        description: asOptionalString(item.description),
        unit_cost: Number.isFinite(unitCost) ? unitCost : undefined,
        currency: asOptionalString(item.currency) ?? "JPY",
        note: asOptionalString(item.note),
      },
      rowIndex: index,
    })
  })

  ensureArray(payload.labor_roles).forEach((item, index) => {
    const name = asString(item.name)
    const id = asOptionalString(item.id)
    const naturalKey = name
    const key = buildKey(id, naturalKey)
    const isDeleted = asBoolean(item.is_deleted)

    if (!isDeleted && !name) {
      addIssue(issues, "labor_roles", key, "name は必須です", "name")
    }

    const hourlyRate = asNumber(item.hourly_rate)
    if (!isDeleted && item.hourly_rate !== undefined && Number.isNaN(hourlyRate)) {
      addIssue(issues, "labor_roles", key, "hourly_rate は数値で入力してください", "hourly_rate")
    }

    pushRecord({
      entity: "labor_roles",
      id,
      naturalKey,
      isDeleted,
      data: {
        name,
        hourly_rate: Number.isFinite(hourlyRate) ? hourlyRate : undefined,
        currency: asOptionalString(item.currency) ?? "JPY",
        note: asOptionalString(item.note),
      },
      rowIndex: index,
    })
  })

  ensureArray(payload.equipments).forEach((item, index) => {
    const name = asString(item.name)
    const id = asOptionalString(item.id)
    const naturalKey = name
    const key = buildKey(id, naturalKey)
    const isDeleted = asBoolean(item.is_deleted)

    if (!isDeleted && !name) {
      addIssue(issues, "equipments", key, "name は必須です", "name")
    }

    const acquisitionCost = asNumber(item.acquisition_cost)
    if (!isDeleted && item.acquisition_cost !== undefined && Number.isNaN(acquisitionCost)) {
      addIssue(issues, "equipments", key, "acquisition_cost は数値で入力してください", "acquisition_cost")
    }

    const amortizationYears = asNumber(item.amortization_years)
    if (!isDeleted && item.amortization_years !== undefined && Number.isNaN(amortizationYears)) {
      addIssue(issues, "equipments", key, "amortization_years は数値で入力してください", "amortization_years")
    }

    const utilizationRate = asNumber(item.utilization_rate)
    if (!isDeleted && item.utilization_rate !== undefined && Number.isNaN(utilizationRate)) {
      addIssue(issues, "equipments", key, "utilization_rate は数値で入力してください", "utilization_rate")
    }

    pushRecord({
      entity: "equipments",
      id,
      naturalKey,
      isDeleted,
      data: {
        name,
        acquisition_cost: Number.isFinite(acquisitionCost) ? acquisitionCost : undefined,
        currency: asOptionalString(item.currency) ?? "JPY",
        amortization_years: Number.isFinite(amortizationYears) ? amortizationYears : undefined,
        utilization_rate: Number.isFinite(utilizationRate) ? utilizationRate : undefined,
        note: asOptionalString(item.note),
      },
      rowIndex: index,
    })
  })

  ensureArray(payload.fees).forEach((item, index) => {
    const name = asString(item.name)
    const id = asOptionalString(item.id)
    const naturalKey = name
    const key = buildKey(id, naturalKey)
    const isDeleted = asBoolean(item.is_deleted)

    if (!isDeleted && !name) {
      addIssue(issues, "fees", key, "name は必須です", "name")
    }

    const ratePercent = asNumber(item.rate_percent)
    if (!isDeleted && item.rate_percent !== undefined && Number.isNaN(ratePercent)) {
      addIssue(issues, "fees", key, "rate_percent は数値で入力してください", "rate_percent")
    }

    const fixedAmount = asNumber(item.fixed_amount)
    if (!isDeleted && item.fixed_amount !== undefined && Number.isNaN(fixedAmount)) {
      addIssue(issues, "fees", key, "fixed_amount は数値で入力してください", "fixed_amount")
    }

    pushRecord({
      entity: "fees",
      id,
      naturalKey,
      isDeleted,
      data: {
        name,
        rate_percent: Number.isFinite(ratePercent) ? ratePercent : undefined,
        fixed_amount: Number.isFinite(fixedAmount) ? fixedAmount : undefined,
        currency: asOptionalString(item.currency) ?? "JPY",
        note: asOptionalString(item.note),
      },
      rowIndex: index,
    })
  })

  ensureArray(payload.option_presets).forEach((item, index) => {
    const name = asString(item.name)
    const id = asOptionalString(item.id)
    const naturalKey = name
    const key = buildKey(id, naturalKey)
    const isDeleted = asBoolean(item.is_deleted)

    if (!isDeleted && !name) {
      addIssue(issues, "option_presets", key, "name は必須です", "name")
    }

    const variants = parseVariants(item.variants, issues, "option_presets", key, "variants")

    pushRecord({
      entity: "option_presets",
      id,
      naturalKey,
      isDeleted,
      data: {
        name,
        variants,
      },
      rowIndex: index,
    })
  })

  ensureArray(payload.products).forEach((item, index) => {
    const name = asString(item.product_name)
    const id = asOptionalString(item.id)
    const naturalKey = name
    const key = buildKey(id, naturalKey)
    const isDeleted = asBoolean(item.is_deleted)

    if (!isDeleted && !name) {
      addIssue(issues, "products", key, "product_name は必須です", "product_name")
    }

    const salePrice = asNumber(item.sale_price)
    if (!isDeleted && !Number.isFinite(salePrice)) {
      addIssue(issues, "products", key, "sale_price は必須の数値です", "sale_price")
    }

    const baseManHours = asNumber(item.base_man_hours)
    if (!isDeleted && !Number.isFinite(baseManHours)) {
      addIssue(issues, "products", key, "base_man_hours は必須の数値です", "base_man_hours")
    }

    const expectedQty = asNumber(item.expected_quantity)
    if (!isDeleted && !Number.isFinite(expectedQty)) {
      addIssue(issues, "products", key, "expected_quantity は必須の数値です", "expected_quantity")
    }

    const expectedPeriodYears = asNumber(item.expected_period_years)
    const defaultElectricityCost = asNumber(item.default_electricity_cost)
    const productionLotSize = asNumber(item.production_lot_size)

    if (!isDeleted && item.expected_period_years !== undefined && Number.isNaN(expectedPeriodYears)) {
      addIssue(issues, "products", key, "expected_period_years は数値で入力してください", "expected_period_years")
    }

    if (!isDeleted && item.default_electricity_cost !== undefined && Number.isNaN(defaultElectricityCost)) {
      addIssue(issues, "products", key, "default_electricity_cost は数値で入力してください", "default_electricity_cost")
    }

    if (!isDeleted && item.production_lot_size !== undefined && Number.isNaN(productionLotSize)) {
      addIssue(issues, "products", key, "production_lot_size は数値で入力してください", "production_lot_size")
    }

    const sizeVariants = parseVariants(item.size_variants, issues, "products", key, "size_variants")
    const productStock = asNumber(item.stock)

    pushRecord({
      entity: "products",
      id,
      naturalKey,
      isDeleted,
      data: {
        product_name: name,
        category_large: asOptionalString(item.category_large),
        category_medium: asOptionalString(item.category_medium),
        category_small: asOptionalString(item.category_small),
        sale_price: Number.isFinite(salePrice) ? salePrice : undefined,
        base_man_hours: Number.isFinite(baseManHours) ? baseManHours : undefined,
        expected_period_years: Number.isFinite(expectedPeriodYears) ? expectedPeriodYears : 1,
        expected_quantity: Number.isFinite(expectedQty) ? expectedQty : undefined,
        size_variants: sizeVariants,
        default_electricity_cost: Number.isFinite(defaultElectricityCost) ? defaultElectricityCost : undefined,
        production_lot_size: Number.isFinite(productionLotSize) ? productionLotSize : 1,
        equipment_names: asOptionalString(item.equipment_names),
        notes: asOptionalString(item.notes),
        image_url: asOptionalString(item.image_url),
        stock: Number.isFinite(productStock) ? productStock : undefined,
      },
      rowIndex: index,
    })
  })

  handleDuplicateKeys()

  const maps = buildCategoryMaps(normalized, existing)

  normalized.categories_medium.forEach((record) => {
    if (record.isDeleted) return
    const key = buildKey(record.id, record.naturalKey)
    const largeName = asOptionalString(record.data.large_name)
    const largeId = asOptionalString(record.data.large_id)
    if (largeId && maps.largeById.has(largeId)) return
    if (largeName && maps.largeByName.has(largeName)) {
      record.data.large_id = maps.largeByName.get(largeName)
      return
    }
    addIssue(issues, "categories_medium", key, "親カテゴリ(大)が見つかりません", "large_id")
  })

  normalized.categories_small.forEach((record) => {
    if (record.isDeleted) return
    const key = buildKey(record.id, record.naturalKey)
    const mediumId = asOptionalString(record.data.medium_id)
    const largeName = asOptionalString(record.data.large_name)
    const mediumName = asOptionalString(record.data.medium_name)

    if (mediumId && maps.mediumById.has(mediumId)) return

    if (mediumName) {
      const lookupLargeId = largeName ? maps.largeByName.get(largeName) : undefined
      if (lookupLargeId) {
        const medium = maps.mediumByName.get(`${lookupLargeId}::${mediumName}`)
        if (medium) {
          record.data.medium_id = medium.id
          return
        }
      }
    }

    addIssue(issues, "categories_small", key, "親カテゴリ(中)が見つかりません", "medium_id")
  })

  normalized.products.forEach((record) => {
    if (record.isDeleted) return
    const key = buildKey(record.id, record.naturalKey)
    const largeName = asOptionalString(record.data.category_large)
    const mediumName = asOptionalString(record.data.category_medium)
    const smallName = asOptionalString(record.data.category_small)

    if (largeName && !maps.largeByName.has(largeName)) {
      addIssue(issues, "products", key, `カテゴリ(大)が見つかりません: ${largeName}`, "category_large")
    }

    if (mediumName) {
      const largeId = largeName ? maps.largeByName.get(largeName) : undefined
      if (largeId) {
        const medium = maps.mediumByName.get(`${largeId}::${mediumName}`)
        if (!medium) {
          addIssue(issues, "products", key, `カテゴリ(中)が見つかりません: ${mediumName}`, "category_medium")
        }
      }
    }

    if (smallName && mediumName && largeName) {
      const largeId = maps.largeByName.get(largeName)
      if (largeId) {
        const medium = maps.mediumByName.get(`${largeId}::${mediumName}`)
        if (!medium) {
          addIssue(issues, "products", key, `カテゴリ(中)が見つかりません: ${mediumName}`, "category_medium")
        }
      }
    }

    const equipmentNames = asOptionalString(record.data.equipment_names)
    if (equipmentNames) {
      equipmentNames
        .split("|")
        .map((name) => name.trim())
        .filter(Boolean)
        .forEach((name) => {
          if (!maps.equipmentByName.has(name)) {
            addIssue(issues, "products", key, `設備が見つかりません: ${name}`, "equipment_names")
          }
        })
    }
  })

  return { normalized, issues }
}
