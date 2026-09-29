-- Reference data: canonical departments from docs/08_DATABASE_SCHEMA.md §3.2.
-- This is configuration, not sample/citizen data. Idempotent.
INSERT INTO "department" ("code", "name", "default_categories") VALUES
  ('ROADS_MUNICIPAL_ENGINEERING', 'Roads / Municipal Engineering', '["POTHOLE_ROAD_DAMAGE"]'::jsonb),
  ('SOLID_WASTE_MANAGEMENT', 'Solid Waste Management', '["GARBAGE"]'::jsonb),
  ('STORM_WATER_DRAINAGE', 'Storm Water Drainage', '["DRAINAGE_WATERLOGGING"]'::jsonb),
  ('ELECTRICAL_STREET_LIGHTING', 'Electrical / Street Lighting', '["STREETLIGHT_FAILURE"]'::jsonb),
  ('GARDENS_TREE_AUTHORITY', 'Gardens / Tree Authority', '["FALLEN_TREE"]'::jsonb),
  ('WATER_SUPPLY', 'Water Supply', '["WATER_LEAKAGE"]'::jsonb),
  ('GENERAL', 'General / Unclassified', '["OTHER"]'::jsonb)
ON CONFLICT ("code") DO NOTHING;
