BEGIN;
INSERT INTO games (slug,title,description,game_url,status)
VALUES ('crystal-arena','Crystal Arena','Kumpulkan kristal dan hindari para penjaga arena.','/games/crystal-arena/index.html','published')
ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,game_url=EXCLUDED.game_url,status='published';
COMMIT;
