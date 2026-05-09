export type Inventory = Record<string, number>;

export type DepotPresetId = "balanced" | "cornucopia" | "lean";

export type DepotPreset = {
  id: DepotPresetId;
  label: string;
  description: string;
  stock: Inventory;
};

export type DepotConfig = {
  presetId: DepotPresetId;
};

export type AllianceState = {
  id: string;
  memberIds: string[];
  inventory: Inventory;
};

export const DEPOT_PRESETS: Record<DepotPresetId, DepotPreset> = {
  balanced: {
    id: "balanced",
    label: "Balanced Depot",
    description: "A practical spread of weapons, food, and recovery items.",
    stock: {
      bow: 2,
      arrows: 12,
      ration: 8,
      medkit: 2,
      camouflage: 2,
      rope: 2,
    },
  },
  cornucopia: {
    id: "cornucopia",
    label: "Cornucopia",
    description: "A brutal opening haul with enough gear to spark early fights.",
    stock: {
      bow: 3,
      arrows: 18,
      spear: 4,
      ration: 6,
      medkit: 3,
      camouflage: 1,
      trap: 2,
    },
  },
  lean: {
    id: "lean",
    label: "Lean Supplies",
    description: "Bare minimum supplies for a harsher, more desperate run.",
    stock: {
      bow: 1,
      arrows: 4,
      ration: 3,
      medkit: 1,
      camouflage: 1,
    },
  },
};

export const ITEM_LABELS: Record<string, string> = {
  bow: "Bow",
  arrows: "Arrows",
  spear: "Spear",
  ration: "Food Ration",
  medkit: "Medkit",
  rope: "Rope",
  trap: "Trap",
  camouflage: "Camouflage",
};

export const DEPOT_ITEM_LABELS = ITEM_LABELS;

export function displayItemLabel(itemId: string) {
  const label = ITEM_LABELS[itemId] ?? itemId;
  if (itemId === "camouflage") return "Camouflage Kit";
  return label.startsWith("Food ") ? label.slice(5) : label;
}

export function getDepotPreset(presetId?: string): DepotPreset {
  if (presetId && presetId in DEPOT_PRESETS) {
    return DEPOT_PRESETS[presetId as DepotPresetId];
  }
  return DEPOT_PRESETS.balanced;
}

export function cloneInventory(inventory: Inventory | undefined | null): Inventory {
  return { ...(inventory ?? {}) };
}

export function addItem(inventory: Inventory, itemId: string, quantity = 1) {
  if (quantity <= 0) return inventory;
  inventory[itemId] = (inventory[itemId] ?? 0) + quantity;
  return inventory;
}

export function getItemCount(inventory: Inventory | undefined | null, itemId: string) {
  return inventory?.[itemId] ?? 0;
}

export function hasItem(inventory: Inventory | undefined | null, itemId: string, quantity = 1) {
  return getItemCount(inventory, itemId) >= quantity;
}

export function consumeItem(inventory: Inventory, itemId: string, quantity = 1) {
  if (!hasItem(inventory, itemId, quantity)) return false;
  const remaining = (inventory[itemId] ?? 0) - quantity;
  if (remaining > 0) {
    inventory[itemId] = remaining;
  } else {
    delete inventory[itemId];
  }
  return true;
}

export function listInventoryItems(inventory: Inventory | undefined | null) {
  return Object.entries(inventory ?? {})
    .filter(([, quantity]) => quantity > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([itemId, quantity]) => ({
      itemId,
      label: ITEM_LABELS[itemId] ?? itemId,
      quantity,
    }));
}

export function inventoryToPool(inventory: Inventory) {
  const pool: string[] = [];
  for (const [itemId, quantity] of Object.entries(inventory)) {
    for (let i = 0; i < quantity; i++) {
      pool.push(itemId);
    }
  }
  return pool;
}

export function poolToInventory(pool: string[]) {
  const inventory: Inventory = {};
  for (const itemId of pool) {
    addItem(inventory, itemId, 1);
  }
  return inventory;
}

export function takeOneItem(inventory: Inventory) {
  const entry = Object.entries(inventory).find(([, quantity]) => quantity > 0);
  if (!entry) return null;

  const [itemId] = entry;
  consumeItem(inventory, itemId, 1);
  return itemId;
}
