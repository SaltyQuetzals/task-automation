export const CATEGORY_MAPPING: Record<string, string> = {
  "Clean Community Service": process.env.YNAB_CATEGORY_CLEAN_COMMUNITY_SERVICE || "",
  "Street Service": process.env.YNAB_CATEGORY_STREET_SERVICE || "",
  "Drainage Service": process.env.YNAB_CATEGORY_DRAINAGE_SERVICE || "",
  "Solid Waste Services": process.env.YNAB_CATEGORY_SOLID_WASTE_SERVICES || "",
  Water: process.env.YNAB_CATEGORY_WATER || "",
  Electric: process.env.YNAB_CATEGORY_ELECTRIC || "",
  Wastewater: process.env.YNAB_CATEGORY_WASTEWATER || "",
};
