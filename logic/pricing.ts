// logic/pricing.ts
export function getEffectivePrice(base: number, custom?: number) {
  return custom ?? base;
}
