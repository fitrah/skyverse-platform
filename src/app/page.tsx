import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

type CatalogGame = { slug: string; title: string; description: string; game_url: string; project_id: string | null };

const fallbackGames: CatalogGame[] = [
  {
    slug: "mila-cafe",
    title: "Mila Cafe",
    description: "Layani pesanan cepat, jaga hati tetap penuh, dan buka level yang makin sibuk.",
    game_url: "/games/mila-cafe/index.html",
    project_id: null,
  },
  {
    slug: "abigel-apartment",
    title: "Abigel Apartment",
    description: "Jelajahi apartemen 3D, cari empat foto, pecahkan kode, lalu kabur.",
    game_url: "/games/abigel-apartment/index.html",
    project_id: null,
  },
  {
    slug: "drone-rush",
    title: "Skyverse Drone Rush",
    description: "Survival FPS ringan dengan room privat, bot, lima wave, dan boss.",
    game_url: "/games/drone-rush/index.html",
    project_id: null,
  },
  {
    slug: "memory-match-online",
    title: "Memory Match Online",
    description: "Room kartu online untuk dua sampai empat pemain dengan giliran server.",
    game_url: "/games/memory-match-online/index.html",
    project_id: null,
  },
];

function gameMeta(game: CatalogGame, index: number) {
  const isOnline = game.slug === "memory-match-online" || game.slug === "drone-rush";
  const initial = game.title.replace(/^Skyverse\s+/i, "").trim()[0]?.toUpperCase() ?? "S";
  const palette = ["ocean", "ember", "mint", "violet", "sun"][index % 5];
  return {
    initial,
    palette,
    mode: isOnline ? "Online" : "Solo",
    action: game.slug === "memory-match-online" ? "Buka room" : game.slug === "drone-rush" ? "Masuk arena" : "Main",
    tag: game.project_id ? "Creator" : game.slug.includes("apartment") ? "Story" : isOnline ? "Multiplayer" : "Arcade",
  };
}

async function loadCatalogGames() {
  try {
    const result = await query<CatalogGame>("SELECT slug,title,description,game_url,project_id::text FROM games WHERE status='published' ORDER BY created_at DESC LIMIT 12");
    return result.rows.length ? result.rows : fallbackGames;
  } catch {
    console.warn("Skyverse catalog fallback loaded.");
    return fallbackGames;
  }
}

export default async function Home() {
  const user = await getCurrentUser();
  const games = await loadCatalogGames();
  const featured = games[0] ?? fallbackGames[0];
  const featuredMeta = gameMeta(featured, 0);

  return <main className="appShell">
    <header className="topBar">
      <Link className="logo" href="/">SKY<span>VERSE</span></Link>
      {user ? <Link className="playerPill" href="/profile"><i>{user.username[0].toUpperCase()}</i><span>@{user.username}</span></Link> : <Link className="playerPill" href="/login"><i>in</i><span>Masuk</span></Link>}
    </header>

    <section className={`featuredGame ${featuredMeta.palette}`}>
      <div className="featuredCopy">
        <small>{featuredMeta.tag} · {featuredMeta.mode}</small>
        <h1>{featured.title}</h1>
        <p>{featured.description}</p>
        <div className="featuredActions">
          <Link className="primaryAction" href={featured.game_url}>{featuredMeta.action}</Link>
          <a className="secondaryAction" href="#games">Lihat semua</a>
        </div>
      </div>
      <div className="featuredBadge" aria-hidden="true">
        <span>{featuredMeta.initial}</span>
      </div>
    </section>

    <section className="quickPanel" aria-label="Aksi cepat">
      <Link href="#games"><b>{games.length}</b><span>Game aktif</span></Link>
      <Link href={user ? "/profile" : "/login?next=/profile"}><b>{user ? "Akun" : "Login"}</b><span>Progres pemain</span></Link>
      <Link href={user ? "/create" : "/login?next=/create"}><b>Buat</b><span>Creator studio</span></Link>
    </section>

    <section className="gameLibrary" id="games">
      <div className="sectionHead">
        <div>
          <small>Library</small>
          <h2>Pilih game</h2>
        </div>
        <Link href={user ? "/create" : "/register"}>Creator</Link>
      </div>

      <div className="filterRow" aria-label="Filter visual">
        <span className="active">Semua</span>
        <span>Solo</span>
        <span>Online</span>
        <span>Story</span>
      </div>

      <div className="gameList">
        {games.map((game, index) => {
          const meta = gameMeta(game, index);
          return <article key={`${game.game_url}-${game.title}`} className="gameCard">
            <Link className={`gameIcon ${meta.palette}`} href={game.game_url} aria-label={`Main ${game.title}`}>
              <span>{meta.initial}</span>
            </Link>
            <div className="gameInfo">
              <div>
                <small>{meta.tag} · {meta.mode}</small>
                <h3>{game.title}</h3>
                <p>{game.description}</p>
              </div>
              <Link className="cardPlay" href={game.game_url}>{meta.action}</Link>
            </div>
          </article>;
        })}
      </div>
    </section>

    <section className="creatorStrip" id="about">
      <div>
        <small>Skyverse Creator</small>
        <h2>Bikin game dari ide, lalu publish ke library.</h2>
        <p>Mode web tetap tersedia untuk desktop, sementara tampilan ini disiapkan supaya nyaman dipakai sebagai app Android.</p>
      </div>
      <Link href={user ? "/create" : "/login?next=/create"}>Buka studio</Link>
    </section>

    <nav className="bottomNav" aria-label="Navigasi utama">
      <a href="#games"><span>Game</span></a>
      <Link href={user ? "/create" : "/login?next=/create"}><span>Create</span></Link>
      <Link href={user ? "/profile" : "/login"}><span>{user ? "Profil" : "Masuk"}</span></Link>
    </nav>
  </main>;
}
