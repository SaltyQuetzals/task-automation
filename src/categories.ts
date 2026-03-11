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
  [YNABCategory.CleanCommunityService]: env.YNAB_CLEAN_COMMUNITY_SERVICE_CATEGORY_ID,
  [YNABCategory.StreetService]: env.YNAB_STREET_SERVICE_CATEGORY_ID,
  [YNABCategory.DrainageService]: env.YNAB_DRAINAGE_SERVICE_CATEGORY_ID,
  [YNABCategory.SolidWasteServices]: env.YNAB_SOLID_WASTE_SERVICES_CATEGORY_ID,
  [YNABCategory.Water]: env.YNAB_WATER_CATEGORY_ID,
  [YNABCategory.Electric]: env.YNAB_ELECTRIC_CATEGORY_ID,
  [YNABCategory.Wastewater]: env.YNAB_WASTEWATER_CATEGORY_ID,
  [YNABCategory.Gas]: env.YNAB_GAS_CATEGORY_ID,
  [YNABCategory.Reimbursements]: env.YNAB_REIMBURSEMENT_CATEGORY_ID,
};
