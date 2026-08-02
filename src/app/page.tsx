import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

type CatalogGame = { slug: string; title: string; description: string; game_url: string; project_id: string | null };

export default async function Home() {
  const user = await getCurrentUser();
  const result = await query<CatalogGame>("SELECT slug,title,description,game_url,project_id::text FROM games WHERE status='published' ORDER BY created_at DESC LIMIT 12");
  const games = result.rows;
  return <main>
    <nav><Link className="logo" href="/">SKY<span>VERSE</span></Link><div className="navlinks"><a href="#games">Jelajahi</a><Link href="/create">Buat Game</Link><a href="#about">Tentang</a></div>{user?<div className="actions"><Link className="creatorNav" href="/create">✨ Buat Game</Link><Link className="userChip" href="/profile"><i>{user.username[0].toUpperCase()}</i><span>@{user.username}</span></Link><form action="/api/auth/logout" method="post"><button className="ghost">Logout</button></form></div>:<div className="actions"><Link className="ghost" href="/login">Masuk</Link><Link className="join" href="/register">Daftar</Link></div>}</nav>
    <section className="hero"><div className="heroCopy"><p className="eyebrow">DUNIA BARU MENUNGGUMU</p><h1>Mainkan. Jelajahi.<br/><span>Ciptakan duniamu.</span></h1><p>Temukan game buatan komunitas atau tulis idemu dan biarkan Skyverse Creator membangun game untukmu.</p><div className="heroButtons"><a className="play" href="#games">Jelajahi Game <b>→</b></a><Link className="createPlay" href={user?"/create":"/login?next=/create"}>✨ Buat dengan Prompt</Link></div></div><div className="heroArt"><div className="planet"><i/><i/><i/></div><div className="avatar"><div className="hair"/><div className="head"/><div className="body"/><div className="leg l"/><div className="leg r"/></div></div></section>
    <section className="games" id="games"><div className="sectionHead"><div><small>PILIH PETUALANGANMU</small><h2>Game Komunitas</h2></div><Link href={user?"/create":"/register"}>Buat Game →</Link></div><div className="grid">{games.map((g,i)=><article key={`${g.game_url}-${g.title}`} className={g.project_id?"generated":i%2?"arena":"sky"}><div className="cover"><span>{g.slug==='memory-match-online'?'🃏':g.project_id?'✨':i%2?'💎':'☁️'}</span>{g.project_id&&<em>AI CREATED</em>}</div><div className="gameInfo"><div><h3>{g.title}</h3><p>{g.description}</p></div><small>● {g.slug==='memory-match-online'?'2–4 pemain online':'1 pemain'}</small></div><Link className="cardPlay" href={g.game_url}>MAIN SEKARANG</Link></article>)}</div></section>
    <section className="about" id="about"><b>AI</b><div><small>SKYVERSE CREATOR</small><h2>Dari prompt menjadi game yang bisa dimainkan.</h2><p>Pilih ide, karakter, dunia, dan tantangan. Generator aman Skyverse menyusun game Canvas yang ramah desktop dan ponsel, lalu pembuatnya dapat merevisi dan memublikasikannya ke komunitas.</p></div></section>
  </main>;
}
