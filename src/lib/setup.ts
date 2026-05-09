import { save, load } from "./localStorage";
import { v4 as uuidv4 } from 'uuid'
import type { AllianceState, DepotConfig, Inventory } from "./inventory";
import { cloneInventory } from "./inventory";

export type Relationship = {
  trust: number; // -100 = hates them, 0 = neutral, 100 = fully trusts
  alliance: boolean; // currently allied?
};

export type Tribute = {
  name: string;
  pronouns: Pronouns;
  image: string | null;
  bio: string;
  id: string;
  district: number;
  relationships: Record<string, Relationship>; // keyed by other tribute IDs
  health: Health;
  foodLvl: number
  inventory: Inventory;
};
// Color schemes extracted from globals.css (using hex values for Stripe compatibility)
const colorSchemes = {
  default: {
    light: {
      colorPrimary: "#1a1a2e", // Dark blue-gray
      colorBackground: "#ffffff", // White
      colorText: "#0f172a", // Dark slate
      colorDanger: "#dc2626", // Red-600
    },
    dark: {
      colorPrimary: "#cbd5e1", // Light slate
      colorBackground: "#0f172a", // Dark slate
      colorText: "#f8fafc", // Light gray
      colorDanger: "#ef4444", // Red-500
    }
  },
  catppuccin: {
    light: {
      colorPrimary: "#7287fd", // Lavender
      colorBackground: "#eff1f5", // Base (light)
      colorText: "#4c4f69", // Text (dark)
      colorDanger: "#d20f39", // Red
    },
    dark: {
      colorPrimary: "#b4befe", // Lavender
      colorBackground: "#1e1e2e", // Base (dark)
      colorText: "#cdd6f4", // Text (light)
      colorDanger: "#f38ba8", // Red
    }
  }
};

// Font configuration for Stripe
const fontConfig = {
  fontSizeBase: "16px",
  fontFamily: "'IBM Plex Mono', monospace",

};

// Get current theme and palette from document
function getCurrentTheme(): { theme: 'light' | 'dark', palette: 'default' | 'catppuccin' } {
  if (typeof window === 'undefined') {
    return { theme: 'light', palette: 'default' };
  }

  const html = document.documentElement;
  const isDark = html.classList.contains('dark');
  const isCatppuccin = html.hasAttribute('data-palette') && html.getAttribute('data-palette') === 'catppuccin';

  return {
    theme: isDark ? 'dark' : 'light',
    palette: isCatppuccin ? 'catppuccin' : 'default'
  };
}

export function getStripeAppearance() {
  const { theme, palette } = getCurrentTheme();
  const colors = colorSchemes[palette][theme];

  return {
    theme: "stripe" as const,
    variables: {
      ...colors,
      borderRadius: "0.625rem",
      spacingUnit: "2px",
      ...fontConfig,
    },
    props: {
      
    }
  };
}

// React hook for reactive theme tracking
import { useState, useEffect } from 'react';

export function useStripeAppearance() {
  const [appearance, setAppearance] = useState(getStripeAppearance());

  useEffect(() => {
    // Initial appearance
    setAppearance(getStripeAppearance());

    // Create observer for class and attribute changes
    const observer = new MutationObserver(() => {
      setAppearance(getStripeAppearance());
    });

    // Observe the html element for class and attribute changes
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-palette']
    });

    return () => observer.disconnect();
  }, []);

  return appearance;
}

export type Health = {
  mental: number,
  physical: number
}

export type Pronouns = {
  subject: string;
  object: string;
  possessive: string;
  reflexive: string;
};

// reusable story skeleton
export type EventTextPart = string | { role: string; prop: string };

export type EventTemplate = {
  id: string;
  type: "kill" | "kill2" | "alliance" | "find" | "feast" | "generic" | "training" | "combat";
  text: EventTextPart[];
  roles: string[];
  effects?: (db: HngrDB, tributes: Record<string, Tribute>) => void;
  conditions?: (db: HngrDB, tributes: Record<string, Tribute>) => boolean;
  source?: "core" | "user";
};

export type Event = {
  id: string;
  templateId: string;
  day: number;
  roles: Record<string, string>;
  description: EventTextPart[];
};

// database with tributes + events
export type HngrDB = {
  tributeReferralName: { singular: string; plural: string };
  tributes: Record<string, Tribute>; // tribute ID -> Tribute
  events: Record<number, Event[]>;
  depot: DepotConfig;
  alliances: Record<string, AllianceState>;
};

export function normalizeDatabase(db: Partial<HngrDB> | null | undefined): HngrDB {
  const base: HngrDB = {
    tributeReferralName: db?.tributeReferralName ?? {
      singular: "tribute",
      plural: "tributes",
    },
    tributes: {},
    events: Array.isArray(db?.events) ? {} : (db?.events ?? {}),
    depot: {
      presetId: db?.depot?.presetId ?? "balanced",
    },
    alliances: db?.alliances ?? {},
  };

  for (const [tributeId, tribute] of Object.entries(db?.tributes ?? {})) {
    const relationships = tribute.relationships ?? {};
    if (!relationships[tributeId]) {
      relationships[tributeId] = { trust: 0, alliance: false };
    }

    base.tributes[tributeId] = {
      ...tribute,
      foodLvl: typeof tribute.foodLvl === "number" ? tribute.foodLvl : 0,
      inventory: cloneInventory((tribute as Tribute).inventory),
      relationships,
      health: tribute.health ?? { physical: 100, mental: 100 },
    } as Tribute;
  }

  for (const [allianceId, alliance] of Object.entries(db?.alliances ?? {})) {
    base.alliances[allianceId] = {
      id: alliance.id ?? allianceId,
      memberIds: Array.isArray(alliance.memberIds) ? alliance.memberIds : [],
      inventory: cloneInventory(alliance.inventory),
    };
  }

  return base;
}

export function setupDatabase() {
  // see if it already exists
  const existing = load<HngrDB>("hngr-db");
  if (existing) return normalizeDatabase(existing);

  // make fresh database
  const defaultDB: HngrDB = {
    tributeReferralName: {
      singular: "tribute",
      plural: "tributes",
    },
    events: {},
    tributes: {},
    depot: {
      presetId: "balanced",
    },
    alliances: {},
  };

  // Create tributes keyed by ID with district information
  for (let district = 1; district <= 12; district++) {
    for (let i = 0; i < 2; i++) {
      const id = uuidv4();
        defaultDB.tributes[id] = {
          name: "",
          pronouns: { subject: "", object: "", possessive: "", reflexive: "" },
          image: null,
          bio: "",
          health: { physical: 100, mental: 100},
          foodLvl: 0,
          inventory: {},
          id,
          district,
          relationships: {},
        };
    }
  }

  // Populate relationships for each tribute with neutral trust and no alliance for every other tribute
  const allTributes = Object.values(defaultDB.tributes);
  for (const tribute of allTributes) {
    tribute.relationships[tribute.id] = { trust: 0, alliance: false };
    for (const otherTribute of allTributes) {
      if (tribute.id !== otherTribute.id) {
        tribute.relationships[otherTribute.id] = { trust: 0, alliance: false };
      }
    }
  }

  save("hngr-db", defaultDB);
  return normalizeDatabase(defaultDB);
}
