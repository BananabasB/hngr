export function save<T>(key: string, value: T) {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

export function load<T>(key: string): T | null {
  if (typeof window !== "undefined") {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : null;
  }
  return null;
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