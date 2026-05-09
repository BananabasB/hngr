const truthy = new Set(['1', 'true', 'yes', 'on']);

export function isHngrPlusEnabled() {
  const value = process.env.NEXT_PUBLIC_HNGR_PLUS_ENABLED;

  if (value === undefined) {
    return true;
  }

  return truthy.has(value.trim().toLowerCase());
}
