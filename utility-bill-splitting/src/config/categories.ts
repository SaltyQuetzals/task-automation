export const CATEGORY_MAPPING: Record<string, string> = {
  "Clean Community Service": process.env.YNAB_CLEAN_COMMUNITY_SERVICE_CATEGORY_ID || "",
  "Street Service": process.env.YNAB_STREET_SERVICE_CATEGORY_ID || "",
  "Drainage Service": process.env.YNAB_DRAINAGE_SERVICE_CATEGORY_ID || "",
  "Solid Waste Services": process.env.YNAB_SOLID_WASTE_SERVICES_CATEGORY_ID || "",
  Water: process.env.YNAB_WATER_CATEGORY_ID || "",
  Electric: process.env.YNAB_ELECTRIC_CATEGORY_ID || "",
  Wastewater: process.env.YNAB_WASTEWATER_CATEGORY_ID || "",
};
