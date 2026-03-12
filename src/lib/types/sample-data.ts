import type { AppData } from "./app-data"

export const sampleAppData: AppData = {
  categories: {
    large: [
      { id: "cat-l-1", name: "バッグ", description: "バッグ系プロダクト" },
      { id: "cat-l-2", name: "アクセサリー", description: "アクセサリー系" },
    ],
    medium: [
      { id: "cat-m-1", largeId: "cat-l-1", name: "トート", description: "トートバッグ" },
      { id: "cat-m-2", largeId: "cat-l-1", name: "ショルダー", description: "ショルダーバッグ" },
    ],
    small: [
      { id: "cat-s-1", mediumId: "cat-m-1", name: "ミニトート", description: "小型トート" },
    ],
  },
  materials: [
    {
      id: "mat-1",
      name: "キャンバス生地",
      unit: "m",
      sizeDescription: "50m ロール",
      currency: "JPY",
      unitCost: 320,
      unitsPerBatch: 1,
      supplier: "FabricMart",
      note: "8号帆布",
    },
    {
      id: "mat-2",
      name: "本革",
      unit: "㎡",
      sizeDescription: "10㎡ ロット",
      currency: "JPY",
      unitCost: 450,
      unitsPerBatch: 1,
      supplier: "LeatherWorks",
      note: "タンニンなめし",
    },
  ],
  packagingItems: [
    {
      id: "pack-1",
      name: "段ボール S",
      unit: "枚",
      sizeDescription: "320x250x120",
      unitCost: 80,
      currency: "JPY",
      unitsPerBatch: 1,
      note: "クラフト",
    },
    {
      id: "pack-2",
      name: "緩衝材",
      unit: "m",
      sizeDescription: "ロール",
      unitCost: 30,
      currency: "JPY",
      unitsPerBatch: 1,
      note: "エアキャップ",
    },
  ],
  shippingMethods: [
    {
      id: "ship-1",
      name: "宅配便",
      description: "一般的な箱発送",
      unitCost: 180,
      currency: "JPY",
      note: "佐川・ヤマト想定",
    },
    {
      id: "ship-2",
      name: "メール便",
      description: "ポスト投函",
      unitCost: 120,
      currency: "JPY",
      note: "小型製品向け",
    },
  ],
  laborRoles: [
    { id: "lab-1", name: "裁断", hourlyRate: 1800, currency: "JPY", note: "" },
    { id: "lab-2", name: "縫製", hourlyRate: 2200, currency: "JPY", note: "" },
  ],
  equipments: [
    {
      id: "eq-1",
      name: "工業用ミシン",
      acquisitionCost: 400000,
      currency: "JPY",
      amortizationYears: 5,
      utilizationRate: 100,
      note: "平ミシン",
    },
    {
      id: "eq-2",
      name: "裁断機",
      acquisitionCost: 600000,
      currency: "JPY",
      amortizationYears: 5,
      utilizationRate: 100,
      note: "自動裁断",
    },
  ],
  fees: [
    {
      id: "fee-1",
      name: "ECプラットフォーム手数料",
      ratePercent: 6.6,
      fixedAmount: 40,
      currency: "JPY",
      note: "販売額の% + 1件あたり固定",
    },
    {
      id: "fee-2",
      name: "決済手数料",
      ratePercent: 3,
      fixedAmount: 0,
      currency: "JPY",
      note: "クレジット決済",
    },
  ],
  optionPresets: [
    {
      id: "opt-pre-1",
      name: "S/M/L 標準",
      variants: [
        { label: "S", quantity: 500 },
        { label: "M", quantity: 750 },
        { label: "L", quantity: 250 },
      ],
    },
  ],
  products: [
    {
      id: "prod-1",
      name: "デイリーミニトート",
      categoryLargeId: "cat-l-1",
      categoryMediumId: "cat-m-1",
      categorySmallId: "cat-s-1",
      sizeVariants: [
        { label: "S", quantity: 1500 },
        { label: "M", quantity: 1500 },
      ],
      baseManHours: 1.5,
      defaultElectricityCost: 25,
      salePrice: 8900,
      registeredAt: "2024-05-01",
      notes: "S/Mの2サイズ展開。金具変更や刺繍オプションあり。",
      productionLotSize: 50,
      expectedProduction: {
        periodYears: 1,
        quantity: 3000,
      },
      equipmentIds: ["eq-1", "eq-2"],
    },
  ],
  costEntries: {
    materials: [
      {
        id: "mat-cost-1",
        productId: "prod-1",
        materialId: "mat-1",
        description: "本体用",
        usageRatio: 80,
        costPerUnit: 350,
        currency: "JPY",
      },
      {
        id: "mat-cost-2",
        productId: "prod-1",
        materialId: "mat-2",
        description: "持ち手革",
        usageRatio: 20,
        costPerUnit: 180,
        currency: "JPY",
      },
    ],
    packaging: [
      {
        id: "pack-cost-1",
        productId: "prod-1",
        packagingItemId: "pack-1",
        quantity: 1,
        costPerUnit: 80,
        currency: "JPY",
      },
      {
        id: "pack-cost-2",
        productId: "prod-1",
        packagingItemId: "pack-2",
        quantity: 0.5,
        costPerUnit: 30,
        currency: "JPY",
      },
    ],
    labor: [
      {
        id: "lab-cost-1",
        productId: "prod-1",
        laborRoleId: "lab-1",
        hours: 0.4,
        peopleCount: 1,
      },
      {
        id: "lab-cost-2",
        productId: "prod-1",
        laborRoleId: "lab-2",
        hours: 0.8,
        peopleCount: 1,
      },
    ],
    outsourcing: [
      {
        id: "out-cost-1",
        productId: "prod-1",
        costPerUnit: 120,
        currency: "JPY",
        note: "部分仕上げ外注",
      },
    ],
    development: [
      {
        id: "dev-cost-1",
        productId: "prod-1",
        title: "初期試作",
        prototypeLaborCost: 150000,
        prototypeMaterialCost: 60000,
        toolingCost: 40000,
        amortizationYears: 2,
      },
    ],
    equipmentAllocations: [
      {
        id: "eq-alloc-1",
        productId: "prod-1",
        equipmentId: "eq-1",
        allocationRatio: 0.5,
        annualQuantity: 3000,
        usageHours: 0.6,
      },
      {
        id: "eq-alloc-2",
        productId: "prod-1",
        equipmentId: "eq-2",
        allocationRatio: 0.3,
        annualQuantity: 3000,
        usageHours: 0.4,
      },
    ],
    logistics: [
      {
        id: "log-cost-1",
        productId: "prod-1",
        shippingMethodId: "ship-1",
        costPerUnit: 180,
        currency: "JPY",
      },
    ],
    electricity: [
      {
        id: "ele-cost-1",
        productId: "prod-1",
        costPerUnit: 25,
        currency: "JPY",
      },
    ],
    fees: [
      {
        id: "fee-cost-1",
        productId: "prod-1",
        feeId: "fee-1",
        ratePercent: 6.6,
        fixedAmount: 40,
        currency: "JPY",
      },
    ],
  },
}

export const defaultAppData = sampleAppData
