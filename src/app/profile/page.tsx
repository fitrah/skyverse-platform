import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import ChangePasswordForm from "@/components/ChangePasswordForm";

type GameProgress = {
  title: string;
  slug: string;
  level: string;
  checkpoint: number;
  best_time_ms: number | null;
  wins: number;
  generated: boolean;
};

type PlayHistory = {
  title: string;
  slug: string;
  score: number;
  won: boolean;
  time_ms: number;
  played_at: Date;
  details: { kills?: number; wave?: number; bossDamage?: number };
};

export default async function Profile() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const result = await query<GameProgress>(
    `SELECT g.title,g.slug,pp.level,pp.checkpoint,pp.best_time_ms,pp.wins,
       (g.project_id IS NOT NULL) AS generated
     FROM player_progress pp JOIN games g ON g.id=pp.game_id
     WHERE pp.user_id=$1 ORDER BY pp.updated_at DESC`,
    [user.id],
  );
  const historyResult = await query<PlayHistory>(
    `SELECT g.title,g.slug,h.score,h.won,h.time_ms,h.played_at,h.details
     FROM game_play_history h JOIN games g ON g.id=h.game_id
     WHERE h.user_id=$1 ORDER BY h.played_at DESC LIMIT 12`,
    [user.id],
  );
  const progress = result.rows;
  const history = historyResult.rows;
  const totalWins = progress.reduce((sum, item) => sum + item.wins, 0);

  return (
    <main className="profile">
      <nav>
        <Link className="logo" href="/">SKY<span>VERSE</span></Link>
        <Link href="/">← Kembali</Link>
      </nav>
      <section>
        <div className="profileAvatar">{user.username[0].toUpperCase()}</div>
        <small>PROFIL PEMAIN</small>
        <h1>{user.username}</h1>
        <p>{user.email}</p>
        <div className="profileStats">
          <div><b>{user.coins}</b><span>KOIN</span></div>
          <div><b>{totalWins}</b><span>TOTAL MENANG</span></div>
        </div>
        <div className="gameProgress">
          <h3>PROGRES GAME</h3>
          {progress.length === 0 ? (
            <p>Belum ada progres. Yuk mainkan game pertamamu!</p>
          ) : progress.map((item, index) => (
            <div className="progressRow" key={`${item.slug}-${item.level}-${index}`}>
              <span>
                <b>{item.title}</b>
                <small>{item.generated ? "GAME KOMUNITAS" : item.level.toUpperCase()}</small>
              </span>
              <span>
                <b>
                  {item.generated
                    ? `Skor terbaik ${item.checkpoint}`
                    : item.slug === "crystal-arena"
                      ? `${item.checkpoint} kristal`
                      : item.slug === "drone-rush"
                        ? `Skor terbaik ${item.checkpoint}`
                        : `Checkpoint ${item.checkpoint}/5`}
                </b>
                <small>
                  {item.wins} kemenangan
                  {item.best_time_ms ? ` · terbaik ${(item.best_time_ms / 1000).toFixed(1)}s` : ""}
                </small>
              </span>
            </div>
          ))}
        </div>
        {history.length > 0 && (
          <div className="playHistory">
            <h3>RIWAYAT TERBARU</h3>
            {history.map((item, index) => (
              <Link href={`/play/${item.slug}`} className="historyRow" key={`${item.slug}-${item.played_at}-${index}`}>
                <span>
                  <b>{item.title}</b>
                  <small>{new Date(item.played_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</small>
                </span>
                <span>
                  <b>{item.score} poin</b>
                  <small className={item.won ? "won" : "lost"}>
                    {item.slug === "drone-rush" && item.details
                      ? `${item.details.kills ?? 0} drone · wave ${item.details.wave ?? 0} · `
                      : ""}
                    {item.won ? "MENANG" : "SELESAI"}
                  </small>
                </span>
              </Link>
            ))}
          </div>
        )}
        <ChangePasswordForm />
        <form className="logoutForm" action="/api/auth/logout" method="post"><button>LOGOUT</button></form>
      </section>
    </main>
  );
}
