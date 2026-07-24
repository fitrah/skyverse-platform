import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

const games = [
  { title: "Skybound Obby", genre: "Adventure · Obby", players: "1 pemain", href: "/games/skybound-obby/index.html", color: "sky", ready: true },
  { title: "Block City", genre: "Roleplay · City", players: "Segera hadir", href: "#", color: "city", ready: false },
  { title: "Crystal Arena", genre: "Action · Survival", players: "1 pemain", href: "/games/crystal-arena/index.html", color: "arena", ready: true },
];

export default async function Home() {
  const user = await getCurrentUser();
  return <main>
    <nav><Link className="logo" href="/">SKY<span>VERSE</span></Link><div className="navlinks"><a href="#games">Jelajahi</a><a href="#games">Populer</a><a href="#about">Tentang</a></div>{user?<div className="actions"><Link className="userChip" href="/profile"><i>{user.username[0].toUpperCase()}</i><span>@{user.username}</span></Link><form action="/api/auth/logout" method="post"><button className="ghost">Logout</button></form></div>:<div className="actions"><Link className="ghost" href="/login">Masuk</Link><Link className="join" href="/register">Daftar</Link></div>}</nav>
    <section className="hero"><div className="heroCopy"><p className="eyebrow">DUNIA BARU MENUNGGUMU</p><h1>Mainkan. Jelajahi.<br/><span>Jadi siapa saja.</span></h1><p>Temukan dunia buatan komunitas, taklukkan tantangan, dan main bersama teman-temanmu.</p><a className="play" href="#games">Jelajahi Game <b>→</b></a></div><div className="heroArt"><div className="planet"><i/><i/><i/></div><div className="avatar"><div className="hair"/><div className="head"/><div className="body"/><div className="leg l"/><div className="leg r"/></div></div></section>
    <section className="games" id="games"><div className="sectionHead"><div><small>PILIH PETUALANGANMU</small><h2>Game Populer</h2></div><button>Lihat Semua →</button></div><div className="grid">{games.map((g,i)=><article key={g.title} className={g.color}><div className="cover"><span>{i===0?'☁️':i===1?'🏙️':'💎'}</span>{!g.ready&&<em>COMING SOON</em>}</div><div className="gameInfo"><div><h3>{g.title}</h3><p>{g.genre}</p></div><small>● {g.players}</small></div>{g.ready?<Link className="cardPlay" href={g.href}>MAIN SEKARANG</Link>:<button className="cardPlay disabled" disabled>SEGERA HADIR</button>}</article>)}</div></section>
    <section className="about" id="about"><b>01</b><div><small>GAME PERTAMA</small><h2>Skybound Obby sudah terhubung.</h2><p>Game 3D yang kita buat sekarang menjadi bagian pertama dari Skyverse. Berikutnya kita bisa menambahkan akun, progres tersimpan, leaderboard, dan game baru.</p></div></section>
  </main>;
}
