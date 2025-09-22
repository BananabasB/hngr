export function save<T>(key: string, value: T) {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

// Handles both "hngr-db" and "hngrDb" keys, and migrates tributes array to flat object
export function load<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }
  // Try main key
  let item = localStorage.getItem(key);
  // If not found, try alternative key
  if (!item && key === "hngr-db") {
    item = localStorage.getItem("hngrDb");
  } else if (!item && key === "hngrDb") {
    item = localStorage.getItem("hngr-db");
  }
  if (!item) return null;
  let parsed: any;
  try {
    parsed = JSON.parse(item);
  } catch {
    return null;
  }

  // Migrate tributes array-by-district to flat object if present
  if (parsed && parsed.tributes && Array.isArray(parsed.tributes)) {
    // tributes is an array of arrays (by district)
    const newTributes: Record<string, any> = {};
    parsed.tributes.forEach((districtArr: any[], districtIdx: number) => {
      if (Array.isArray(districtArr)) {
        districtArr.forEach((tribute) => {
          if (tribute && tribute.id) {
            newTributes[tribute.id] = { ...tribute, district: tribute.district ?? districtIdx + 1 };
          }
        });
      }
    });
    parsed.tributes = newTributes;
    // Save migrated version back to both keys for safety
    localStorage.setItem("hngr-db", JSON.stringify(parsed));
    localStorage.setItem("hngrDb", JSON.stringify(parsed));
  }
  return parsed as T;
}

export function remove(key: string) {
  if (typeof window !== "undefined") {
    localStorage.removeItem(key);
  }
}

// lib/localStorage.ts
export function updateReferralName(
  db: any,
  value: "tributes" | "volunteers" | "nominees"
) {
  if (!db) return db;

  const updated = {
    ...db,
    tributeReferralName: {
      singular:
        value === "tributes"
          ? "tribute"
          : value === "volunteers"
          ? "volunteer"
          : "nominee",
      plural: value,
    },
  };

  localStorage.setItem("hngr-db", JSON.stringify(updated));
  return updated;
}