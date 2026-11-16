-- Guest reviews for experiences (destination pages show the reviews of their experiences).
-- Read-only for the app; seeded sample content for the demo catalog.
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences (id) on delete cascade,
  author_name text not null,
  author_location text,
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text not null,
  travelled_on date not null,
  created_at timestamptz not null default now()
);
create index if not exists reviews_experience_travelled_idx on public.reviews (experience_id, travelled_on desc);

alter table public.reviews enable row level security;
drop policy if exists "Reviews are public" on public.reviews;
create policy "Reviews are public" on public.reviews for select to anon, authenticated using (true);

-- same column-level grant pattern as the rest of the catalog
revoke all on public.reviews from anon, authenticated;
grant select (id, experience_id, author_name, author_location, rating, title, body, travelled_on, created_at)
  on public.reviews to anon, authenticated;

insert into public.reviews (experience_id, author_name, author_location, rating, title, body, travelled_on)
select e.id, r.author_name, r.author_location, r.rating, r.title, r.body, r.travelled_on::date
from (values
  ('tokyo-essentials', 'Hannah M.', 'Melbourne, Australia', 5, 'Perfect first trip to Tokyo',
   'Our guide Kenji made the city feel easy. Senso-ji at opening time was magical, and the Shinjuku evening walk was the highlight. The hotel was right by the station, which helped with jet lag.', '2026-10-21'),
  ('tokyo-essentials', 'Arjun S.', 'Pune, India', 5, 'Well paced, never rushed',
   'Four days is just right. Each day had one big thing and plenty of free time. The metro pass saved us a lot of confusion.', '2026-10-02'),
  ('tokyo-essentials', 'Lucía R.', 'Valencia, Spain', 4, 'Great value',
   'Lovely itinerary and a very kind guide. Day 3 in Shibuya was crowded, so go early if you can. Breakfast was simple but good.', '2026-09-14'),

  ('culture-and-cuisine', 'Tom B.', 'Bristol, UK', 5, 'Ate my way across Tokyo',
   'The depachika food halls and the izakaya night were unforgettable. Our guide knew every stall owner. Come hungry.', '2026-10-18'),
  ('culture-and-cuisine', 'Mei L.', 'Singapore', 5, 'Tea ceremony was a highlight',
   'Calm, thoughtful and beautifully explained. Small group, so it never felt touristy.', '2026-09-30'),
  ('culture-and-cuisine', 'Daniel K.', 'Toronto, Canada', 4, 'Lots of food, lots of walking',
   'Wear comfortable shoes. Everything we tasted was excellent and the cooking class was a lot of fun.', '2026-09-08'),

  ('kyoto-temples-and-tea', 'Sophie D.', 'Lyon, France', 5, 'Kyoto at its most peaceful',
   'Kiyomizu-dera in the early light, then a quiet tea house in Gion. Our guide timed every stop to avoid the crowds.', '2026-11-04'),
  ('kyoto-temples-and-tea', 'Rahul V.', 'Bengaluru, India', 5, 'Beautifully organised',
   'Three relaxed days with real context on every temple. The matcha tasting was a lovely surprise.', '2026-10-12'),
  ('kyoto-temples-and-tea', 'Emma W.', 'Auckland, New Zealand', 4, 'Lovely, a little busy',
   'Autumn colours were stunning. Some temples were busy at midday but the guide always had a quieter route.', '2026-11-09'),

  ('arashiyama-day-trip', 'Kenta O.', 'Osaka, Japan', 5, 'Go early, it is worth it',
   'We were in the bamboo grove before the crowds. The river boat afterwards was the perfect slow finish.', '2026-10-25'),
  ('arashiyama-day-trip', 'Grace P.', 'Dublin, Ireland', 4, 'Gorgeous day out',
   'Bamboo, monkeys and a great tofu lunch. Easy pace and a friendly guide.', '2026-09-20'),
  ('arashiyama-day-trip', 'Marco T.', 'Milan, Italy', 5, 'Best half of our Kyoto trip',
   'The Okochi Sanso garden alone was worth it. Well planned from start to finish.', '2026-10-06'),

  ('ubud-rice-terraces', 'Priya N.', 'Chennai, India', 5, 'Green as far as you can see',
   'Sunrise at Tegallalang, a cooking class with a local family and a water temple blessing. Truly special.', '2026-10-15'),
  ('ubud-rice-terraces', 'Jack H.', 'Perth, Australia', 5, 'Slowed us right down',
   'Exactly the reset we needed. The villa was beautiful and our driver Made was brilliant.', '2026-09-27'),
  ('ubud-rice-terraces', 'Anna S.', 'Berlin, Germany', 4, 'Lovely, bring bug spray',
   'Wonderful scenery and food. Evenings are humid and the mosquitoes are keen, but that is Bali.', '2026-10-30'),

  ('nusa-island-hopping', 'Olivia G.', 'London, UK', 5, 'Those cliffs!',
   'Kelingking looks even better in person. Snorkelling with manta rays was the highlight of our year.', '2026-10-09'),
  ('nusa-island-hopping', 'Ben C.', 'Vancouver, Canada', 4, 'Bumpy but brilliant',
   'The boat crossing is choppy, so take something for sea sickness. Everything else was perfect.', '2026-09-16'),
  ('nusa-island-hopping', 'Aiko F.', 'Tokyo, Japan', 5, 'Crystal clear water',
   'Great guides, safe boats and a lovely beach lunch. Would book again.', '2026-11-02'),

  ('paris-classics', 'Claire J.', 'New York, USA', 5, 'Paris done right',
   'Skip-the-line Louvre, a Seine cruise at sunset and the best croissant of my life. Our guide was a walking history book.', '2026-10-19'),
  ('paris-classics', 'Vikram A.', 'Mumbai, India', 5, 'Every detail handled',
   'Hotel in the Marais was perfect. We saw everything we wanted without feeling rushed.', '2026-09-23'),
  ('paris-classics', 'Ella K.', 'Stockholm, Sweden', 4, 'Wonderful, book Eiffel early',
   'Loved Montmartre and the food tour. The Eiffel Tower slot was late in the day, so ask for an earlier one.', '2026-10-28'),

  ('versailles-day-trip', 'Nora B.', 'Boston, USA', 5, 'The gardens are huge',
   'The Hall of Mirrors is breathtaking, but the gardens stole the show. Renting a golf cart was a great tip.', '2026-10-11'),
  ('versailles-day-trip', 'Luca M.', 'Rome, Italy', 4, 'Worth the trip from Paris',
   'Easy train, great guide, busy palace. Plan for a full day.', '2026-09-29'),
  ('versailles-day-trip', 'Hiro T.', 'Kyoto, Japan', 5, 'Beautiful in autumn',
   'Fewer crowds in October and the trees were golden. Excellent audio guide.', '2026-10-24'),

  ('cape-peninsula-and-penguins', 'Sarah L.', 'Manchester, UK', 5, 'Penguins on the beach!',
   'Boulders Beach was pure joy. Chapman''s Peak drive and Cape Point were spectacular too.', '2026-10-14'),
  ('cape-peninsula-and-penguins', 'Thabo M.', 'Johannesburg, South Africa', 5, 'Showed us our own backyard',
   'Even as locals we learned so much. Lunch in Kalk Bay was a highlight.', '2026-09-21'),
  ('cape-peninsula-and-penguins', 'Julia R.', 'Munich, Germany', 4, 'Windy but wonderful',
   'Bring a jacket for Cape Point. The views and wildlife were worth every gust.', '2026-11-05'),

  ('winelands-escape', 'Chris D.', 'Seattle, USA', 5, 'Three days of bliss',
   'Stellenbosch and Franschhoek tastings, mountain views and incredible food. The tram day was a lot of fun.', '2026-10-08'),
  ('winelands-escape', 'Isabel F.', 'Lisbon, Portugal', 4, 'Relaxing and delicious',
   'Beautiful estates and a lovely guesthouse. Pace yourself on the tastings!', '2026-09-18'),
  ('winelands-escape', 'Nikhil R.', 'Hyderabad, India', 5, 'Perfect anniversary trip',
   'Romantic, scenic and well organised. The picnic in the vineyard was unforgettable.', '2026-10-26'),

  ('new-york-highlights', 'Amelia T.', 'Sydney, Australia', 5, 'NYC in four days',
   'Top of the Rock at sunset, the High Line and a Broadway show. Our guide''s pizza recommendations were spot on.', '2026-10-17'),
  ('new-york-highlights', 'Pedro S.', 'São Paulo, Brazil', 4, 'Big city, well planned',
   'A lot to see but the plan made it manageable. The Statue of Liberty ferry was the best morning.', '2026-09-25'),
  ('new-york-highlights', 'Zoe H.', 'Edinburgh, UK', 5, 'Loved every minute',
   'Central Park by bike, the Met and a jazz night in the Village. Would do it all again.', '2026-11-01'),

  ('brooklyn-food-walk', 'Jordan P.', 'Chicago, USA', 5, 'Come very hungry',
   'Bagels, pizza, pastrami and a dumpling stop we would never have found ourselves. Great stories along the way.', '2026-10-13'),
  ('brooklyn-food-walk', 'Sana K.', 'Dubai, UAE', 5, 'Best afternoon in New York',
   'The view from DUMBO with a slice in hand is unbeatable. Very friendly guide.', '2026-10-27'),
  ('brooklyn-food-walk', 'Felix W.', 'Hamburg, Germany', 4, 'Tasty and fun',
   'Lots of food for the price. A bit of walking between stops, but the neighbourhoods are worth seeing.', '2026-09-19'),

  ('rio-icons', 'Mariana C.', 'Lisbon, Portugal', 5, 'Christ the Redeemer at sunrise',
   'Our guide got us up before the crowds and the view over the bay was unreal. Sugarloaf at sunset to finish.', '2026-10-20'),
  ('rio-icons', 'Ethan B.', 'Denver, USA', 5, 'Rio''s greatest hits',
   'Two days covering every icon without rushing. Felt safe and well looked after throughout.', '2026-09-26'),
  ('rio-icons', 'Yuki S.', 'Nagoya, Japan', 4, 'Cloudy but still amazing',
   'Corcovado was in the clouds for a while, but it cleared and was spectacular. Great local lunch spot.', '2026-11-03'),

  ('samba-and-santa-teresa', 'Camila V.', 'Buenos Aires, Argentina', 5, 'The music never stopped',
   'Santa Teresa''s streets, the Selarón steps and a samba night in Lapa. So much energy.', '2026-10-10'),
  ('samba-and-santa-teresa', 'Oliver N.', 'Leeds, UK', 4, 'Colourful and lively',
   'A brilliant evening. The samba club gets very busy late, so pace yourself.', '2026-09-24'),
  ('samba-and-santa-teresa', 'Aisha M.', 'Nairobi, Kenya', 5, 'Felt like a local',
   'Our guide took us to a neighbourhood roda instead of a tourist show. Unforgettable.', '2026-10-31'),

  ('milford-sound-cruise', 'Liam O.', 'Cork, Ireland', 5, 'Waterfalls everywhere',
   'It rained the day before, so every cliff had a waterfall. Seals and dolphins too. A must do.', '2026-10-16'),
  ('milford-sound-cruise', 'Riya P.', 'Ahmedabad, India', 5, 'Breathtaking',
   'The drive in is half the experience. The cruise was smooth and the scenery unreal.', '2026-11-06'),
  ('milford-sound-cruise', 'Noah F.', 'San Diego, USA', 4, 'Long day, worth it',
   'It is a full day from Queenstown, but the fiord is one of the most beautiful places I have seen.', '2026-09-28'),

  ('queenstown-alpine-escape', 'Maya G.', 'Wellington, New Zealand', 5, 'Adventure and calm in one',
   'Jet boating on the Shotover, a gondola dinner and a lake view room. A perfect mix.', '2026-10-22'),
  ('queenstown-alpine-escape', 'Sam R.', 'Brisbane, Australia', 5, 'Best trip of the year',
   'Milford Sound day was incredible and the Remarkables were dusted with snow. Great guides.', '2026-11-07'),
  ('queenstown-alpine-escape', 'Leah J.', 'Cape Town, South Africa', 4, 'Stunning scenery',
   'Busy town in peak season, but everything was organised so we never queued long.', '2026-10-04')
) as r(slug, author_name, author_location, rating, title, body, travelled_on)
join public.experiences e on e.slug = r.slug
where not exists (select 1 from public.reviews x where x.experience_id = e.id and x.author_name = r.author_name);
