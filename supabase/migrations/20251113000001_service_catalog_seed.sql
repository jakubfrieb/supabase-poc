-- Service Catalog Seed Data
-- Inserts predefined services into the services table

INSERT INTO public.services (name, description, default_price, active) VALUES
  ('Instalatérství', 'Opravy a instalace vodovodních a kanalizačních systémů', 20.00, TRUE),
  ('Elektrikář', 'Elektrické instalace, opravy a revize', 20.00, TRUE),
  ('Zedník', 'Zednické práce, omítky, zdivo', 20.00, TRUE),
  ('Malíř', 'Malířské a natěračské práce', 20.00, TRUE),
  ('Truhlář', 'Dřevěné konstrukce, nábytek, dveře, okna', 20.00, TRUE),
  ('Sklenář', 'Výměna a oprava skel, zasklívání', 20.00, TRUE),
  ('Zámečník', 'Zámky, klíče, kování, bezpečnostní prvky', 20.00, TRUE),
  ('Obkladač', 'Obklady a dlažby', 20.00, TRUE),
  ('Podlahář', 'Pokládka podlah, laminát, parkety', 20.00, TRUE),
  ('Topenář', 'Topení, kotle, radiátory, termostaty', 20.00, TRUE),
  ('Klimatizace', 'Instalace a servis klimatizací', 20.00, TRUE),
  ('Revize elektro', 'Elektrické revize a kontroly', 20.00, TRUE),
  ('Revize plyn', 'Plynové revize a kontroly', 20.00, TRUE),
  ('Tesař', 'Tesařské práce, krovy, střechy', 20.00, TRUE),
  ('Klempíř', 'Klempířské práce, okapy, střechy', 20.00, TRUE),
  ('Zahradník', 'Zahradní práce, údržba zeleně', 20.00, TRUE),
  ('Úklid', 'Úklidové služby', 20.00, TRUE),
  ('Skládka', 'Sběr a odvoz odpadu', 20.00, TRUE)
ON CONFLICT DO NOTHING;

