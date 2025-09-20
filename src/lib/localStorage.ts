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

export function updateReferralName(db: any, setDb: any, key: string) {
  const referralOptions: Record<string, { singular: string; plural: string }> = {
    tributes: { singular: "tribute", plural: "tributes" },
    volunteers: { singular: "volunteer", plural: "volunteers" },
    nominees: { singular: "nominee", plural: "nominees" },
  };

  const option = referralOptions[key];
  const newDb = {
    ...db,
    tributeReferralName: {
      singular: option.singular,
      plural: option.plural,
    },
  };

  setDb(newDb);
  localStorage.setItem("hngrDb", JSON.stringify(newDb));
}