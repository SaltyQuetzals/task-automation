export enum YNABCategory {
  CleanCommunityService = "Clean Community Service",
  StreetService = "Street Service",
  DrainageService = "Drainage Service",
  SolidWasteServices = "Solid Waste Services",
  Water = "Water",
  Electric = "Electric",
  Wastewater = "Wastewater",
  Gas = "Gas",
  Reimbursements = "Reimbursements",
}

export const CATEGORY_MAPPING: Record<YNABCategory, string> = {
  [YNABCategory.CleanCommunityService]: process.env.YNAB_CATEGORY_CLEAN_COMMUNITY_SERVICE!,
  [YNABCategory.StreetService]: process.env.YNAB_CATEGORY_STREET_SERVICE!,
  [YNABCategory.DrainageService]: process.env.YNAB_CATEGORY_DRAINAGE_SERVICE!,
  [YNABCategory.SolidWasteServices]: process.env.YNAB_CATEGORY_SOLID_WASTE_SERVICES!,
  [YNABCategory.Water]: process.env.YNAB_CATEGORY_WATER!,
  [YNABCategory.Electric]: process.env.YNAB_CATEGORY_ELECTRIC!,
  [YNABCategory.Wastewater]: process.env.YNAB_CATEGORY_WASTEWATER!,
  [YNABCategory.Gas]: process.env.YNAB_CATEGORY_GAS!,
  [YNABCategory.Reimbursements]: process.env.YNAB_CATEGORY_REIMBURSEMENTS!,
};
