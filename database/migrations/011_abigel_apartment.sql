BEGIN;

INSERT INTO games (slug,title,description,game_url,status)
VALUES (
  'abigel-apartment',
  'Abigel: Apartemen Yang Terkunci',
  'Game horror eksplorasi. Bantu Abigel menemukan foto Nori, Lila, Reno, dan Toni lalu kabur sebelum apartemen terkunci.',
  '/games/abigel-apartment/index.html',
  'published'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  game_url = EXCLUDED.game_url,
  status = 'published';

COMMIT;
