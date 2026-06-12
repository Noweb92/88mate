/**
 * Specified-work industries (display labels for the values stored in
 * eligible_postcodes.industries and work_periods.industry).
 *
 * Eligibility is per postcode AND per visa: e.g. mining only counts for
 * subclass 417, fishing/tree farming only count in northern Australia
 * for subclass 462. The eligible_postcodes table (generated from the
 * official immi.homeaffairs.gov.au lists) encodes all of this.
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
    label: "Tourism & hospitality (northern / remote areas)",
  },
  { value: "bushfire_recovery", label: "Bushfire recovery work" },
  {
    value: "natural_disaster_recovery",
    label: "Natural disaster recovery work",
  },
] as const;

export function industryLabel(value: string): string {
  return INDUSTRIES.find((i) => i.value === value)?.label ?? value;
}
