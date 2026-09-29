// Department routing — backend-owned configuration (docs/04 §1, docs/09 §2.8).
// Category -> department code. Codes match the seeded rows in the `department` table
// (drizzle/0001_seed_departments.sql). The ML layer contributes the category only.
import type { Category } from "@/lib/enums";

export const CATEGORY_TO_DEPARTMENT: Record<Category, string> = {
  POTHOLE_ROAD_DAMAGE: "ROADS_MUNICIPAL_ENGINEERING",
  GARBAGE: "SOLID_WASTE_MANAGEMENT",
  DRAINAGE_WATERLOGGING: "STORM_WATER_DRAINAGE",
  STREETLIGHT_FAILURE: "ELECTRICAL_STREET_LIGHTING",
  FALLEN_TREE: "GARDENS_TREE_AUTHORITY",
  WATER_LEAKAGE: "WATER_SUPPLY",
  OTHER: "GENERAL",
};

export function departmentCodeForCategory(category: Category): string {
  return CATEGORY_TO_DEPARTMENT[category];
}
