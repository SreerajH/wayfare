-- Experience page "why book this": a short summary and 3 highlights per experience.
-- Booking contact: a phone number (required by the app) and optional special requests.

alter table public.experiences
  add column summary text check (char_length(summary) <= 400),
  add column highlights text[] not null default '{}' check (cardinality(highlights) <= 6);

grant select (summary, highlights) on public.experiences to anon, authenticated;

alter table public.bookings
  add column contact_phone text check (contact_phone ~ '^\+?[0-9 ()-]{6,20}$'),
  add column special_requests text check (char_length(special_requests) <= 500);

-- read-only for the owner (RLS already limits rows); only the create-booking function writes them
grant select (contact_phone, special_requests) on public.bookings to authenticated;

update public.experiences e set summary = v.summary, highlights = v.highlights
from (values
  ('tokyo-essentials', 'Four unhurried days that cover old and new Tokyo, with a local guide, a central hotel and a metro pass that makes getting around easy.',
    array['Senso-ji at opening time, before the crowds', 'Evening walk through Shinjuku and Shibuya Crossing', 'Hotel next to a major metro station']),
  ('culture-and-cuisine', 'Tokyo through its food: depachika food halls, a hands-on cooking class and an izakaya night, with a tea ceremony in between.',
    array['Hands-on Japanese cooking class', 'Tea ceremony with a tea master', 'Izakaya evening with your guide']),
  ('kyoto-temples-and-tea', 'Kyoto''s best-known temples at quiet hours, a traditional tea ceremony and an evening in the old Gion district.',
    array['Fushimi Inari gates early in the morning', 'Private tea ceremony in a machiya townhouse', 'Lantern-lit walk through Gion']),
  ('arashiyama-day-trip', 'A relaxed day in western Kyoto: the bamboo grove, a riverside lunch and the monkey park views over the city.',
    array['Bamboo grove before the tour buses', 'Riverside lunch by the Togetsukyo Bridge', 'Back in central Kyoto by evening']),
  ('ubud-rice-terraces', 'Three days in Bali''s green heart: rice terraces at sunrise, water temples and a village cooking lesson.',
    array['Sunrise at the Tegallalang rice terraces', 'Blessing at the Tirta Empul water temple', 'Balinese cooking class in a family compound']),
  ('nusa-island-hopping', 'A two-day boat trip to Nusa Penida and Lembongan: cliff viewpoints, manta-ray snorkelling and a night by the beach.',
    array['Snorkel with manta rays', 'Kelingking Beach cliff viewpoint', 'Beachfront stay on Nusa Lembongan']),
  ('cape-peninsula-and-penguins', 'The full Cape Peninsula in two days: Chapman''s Peak, the Cape of Good Hope and the penguin colony at Boulders Beach.',
    array['Boulders Beach penguin colony', 'Cape Point lighthouse and viewpoints', 'Chapman''s Peak coastal drive']),
  ('winelands-escape', 'Three slow days in Stellenbosch and Franschhoek with cellar tastings, vineyard lunches and a night on a wine estate.',
    array['Tastings at four family-run estates', 'Long lunch among the vines', 'Overnight stay on a wine farm']),
  ('brooklyn-food-walk', 'A guided afternoon eating your way through DUMBO and Brooklyn Heights, ending with skyline views from the bridge park.',
    array['8+ tastings from local favourites', 'Manhattan skyline from Brooklyn Bridge Park', 'Small group, about 3.5 hours']),
  ('new-york-highlights', 'Four days of New York''s big sights with a local guide, from Central Park to a Broadway night, without the planning.',
    array['Skip-the-line observation deck', 'Central Park and the Met with a guide', 'Evening Broadway show option']),
  ('paris-classics', 'Paris in four days: the Louvre and Orsay without the queues, a Seine cruise at dusk and Montmartre with a local.',
    array['Timed entry to the Louvre', 'Seine cruise at sunset', 'Montmartre walk with a local guide']),
  ('versailles-day-trip', 'A full day at the Palace of Versailles with skip-the-line entry, the Hall of Mirrors and time to explore the gardens.',
    array['Skip-the-line palace entry', 'Hall of Mirrors and the King''s apartments', 'Free time in the gardens and Trianon']),
  ('milford-sound-cruise', 'A scenic coach ride through Fiordland and a cruise beneath Milford Sound''s waterfalls and peaks, back by evening.',
    array['Cruise past Stirling Falls', 'Mirror Lakes and Homer Tunnel stops', 'Optional scenic flight back']),
  ('queenstown-alpine-escape', 'Four days of lakes, peaks and adventure: Milford Sound, a gondola sunset and a day for jet-boating or bungy.',
    array['Day trip to Milford Sound', 'Skyline gondola at sunset', 'Choose your adventure: jet boat or bungy']),
  ('rio-icons', 'Rio''s two great viewpoints in two days, Christ the Redeemer and Sugarloaf, plus Copacabana and the Selarón steps.',
    array['Christ the Redeemer by the early train', 'Sugarloaf cable car at sunset', 'Selarón steps and Lapa with a guide']),
  ('samba-and-santa-teresa', 'An evening in Rio''s bohemian hills: Santa Teresa''s streets, a caipirinha stop and live samba in Lapa.',
    array['Live samba in a Lapa club', 'Caipirinha-making stop', 'Hotel pick-up and drop-off'])
) as v(slug, summary, highlights)
where e.slug = v.slug;
