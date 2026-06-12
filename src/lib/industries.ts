/**
 * Specified-work industries (display labels for the values stored in
 * eligible_postcodes.industries and work_periods.industry).
 */
export const INDUSTRIES = [
  {
    value: "plant_animal_cultivation",
    label: "Plant & animal cultivation (farm work)",
  },
  { value: "fishing_pearling", label: "Fishing & pearling" },
  { value: "tree_farming", label: "Tree farming & felling" },
  { value: "mining", label: "Mining" },
  { value: "construction", label: "Construction" },
  {
    value: "tourism_hospitality",
    label: "Tourism & hospitality (northern / remote only)",
  },
  { value: "bushfire_recovery", label: "Bushfire recovery work" },
] as const;

export function industryLabel(value: string): string {
  return INDUSTRIES.find((i) => i.value === value)?.label ?? value;
}
