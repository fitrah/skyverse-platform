BEGIN;
UPDATE games SET description='Temukan 15 pasang kartu bersama teman. Cocokkan kartu, pertahankan giliran, dan raih skor tertinggi!'
WHERE slug='memory-match-online';
COMMIT;
