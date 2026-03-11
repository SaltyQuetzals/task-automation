import { env } from "./env";

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
  [YNABCategory.CleanCommunityService]: env.YNAB_CATEGORY_CLEAN_COMMUNITY_SERVICE,
  [YNABCategory.StreetService]: env.YNAB_CATEGORY_STREET_SERVICE,
  [YNABCategory.DrainageService]: env.YNAB_CATEGORY_DRAINAGE_SERVICE,
  [YNABCategory.SolidWasteServices]: env.YNAB_CATEGORY_SOLID_WASTE_SERVICES,
  [YNABCategory.Water]: env.YNAB_CATEGORY_WATER,
  [YNABCategory.Electric]: env.YNAB_CATEGORY_ELECTRIC,
  [YNABCategory.Wastewater]: env.YNAB_CATEGORY_WASTEWATER,
  [YNABCategory.Gas]: env.YNAB_CATEGORY_GAS,
  [YNABCategory.Reimbursements]: env.YNAB_CATEGORY_REIMBURSEMENTS,
};
