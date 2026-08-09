import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPool, query } from "@/lib/db";

type Params={params:Promise<{code:string}>};
export async function GET(_:Request,{params}:Params){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Harus login."},{status:401});
 const code=(await params).code.toUpperCase();
 const room=await query<{id:string;status:string;host_user_id:string;seed:number;started_at:Date|null}>("SELECT id::text,status,host_user_id::text,seed,started_at FROM drone_rush_rooms WHERE code=$1",[code]);
 const r=room.rows[0];if(!r)return NextResponse.json({error:"Room tidak ditemukan."},{status:404});
 const member=await query("SELECT 1 FROM drone_rush_players WHERE room_id=$1 AND user_id=$2",[r.id,user.id]);if(!member.rowCount)return NextResponse.json({error:"Belum bergabung."},{status:403});
 await query("UPDATE drone_rush_players SET last_seen=now() WHERE room_id=$1 AND user_id=$2",[r.id,user.id]);
 const players=await query<{id:string;username:string;seat:number;score:number;kills:number;wave:number;finished:boolean;online:boolean}>(`SELECT u.id::text,u.username,p.seat,p.score,p.kills,p.wave,p.finished,p.last_seen>now()-interval '30 seconds' online FROM drone_rush_players p JOIN users u ON u.id=p.user_id WHERE p.room_id=$1 ORDER BY p.seat`,[r.id]);
 return NextResponse.json({room:{code,status:r.status,hostUserId:r.host_user_id,seed:r.seed,startedAt:r.started_at},players:players.rows,me:{id:user.id,username:user.username},serverNow:new Date()});
}
export async function POST(request:Request,{params}:Params){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Harus login."},{status:401});
 const code=(await params).code.toUpperCase(),body=await request.json().catch(()=>({})),action=String(body.action||"");
 const client=await getPool().connect();
 try{await client.query("BEGIN");const room=await client.query<{id:string;status:string;host_user_id:string}>("SELECT id::text,status,host_user_id::text FROM drone_rush_rooms WHERE code=$1 FOR UPDATE",[code]);const r=room.rows[0];if(!r)throw Object.assign(new Error("Room tidak ditemukan."),{status:404});
  const membership=await client.query("SELECT 1 FROM drone_rush_players WHERE room_id=$1 AND user_id=$2",[r.id,user.id]);if(!membership.rowCount)throw Object.assign(new Error("Belum bergabung."),{status:403});
  if(action==="start"){if(r.host_user_id!==user.id)throw Object.assign(new Error("Hanya host yang bisa mulai."),{status:403});if(r.status!=="waiting")throw Object.assign(new Error("Game sudah dimulai."),{status:409});await client.query("UPDATE drone_rush_rooms SET status='playing',started_at=now(),updated_at=now() WHERE id=$1",[r.id]);}
  else if(action==="heartbeat"){const score=Math.max(0,Math.min(999999,Math.floor(Number(body.score)||0))),kills=Math.max(0,Math.min(9999,Math.floor(Number(body.kills)||0))),wave=Math.max(0,Math.min(6,Math.floor(Number(body.wave)||0)));await client.query("UPDATE drone_rush_players SET score=GREATEST(score,$3),kills=GREATEST(kills,$4),wave=GREATEST(wave,$5),last_seen=now() WHERE room_id=$1 AND user_id=$2",[r.id,user.id,score,kills,wave]);}
  else if(action==="finish"){const score=Math.max(0,Math.min(999999,Math.floor(Number(body.score)||0))),kills=Math.max(0,Math.min(9999,Math.floor(Number(body.kills)||0))),wave=Math.max(0,Math.min(6,Math.floor(Number(body.wave)||0))),timeMs=Math.max(1,Math.min(3600000,Math.floor(Number(body.timeMs)||1))),won=body.won===true,bossDamage=Math.max(0,Math.min(999999,Math.floor(Number(body.bossDamage)||0)));
   await client.query("UPDATE drone_rush_players SET score=$3,kills=$4,wave=$5,finished=true,last_seen=now() WHERE room_id=$1 AND user_id=$2",[r.id,user.id,score,kills,wave]);
   const game=await client.query<{id:string}>("SELECT id::text FROM games WHERE slug='drone-rush'");if(!game.rows[0])throw new Error("Game belum terdaftar.");
   await client.query(`INSERT INTO player_progress(user_id,game_id,level,checkpoint,best_time_ms,wins) VALUES($1,$2,'survival',$3,$4,$5) ON CONFLICT(user_id,game_id,level) DO UPDATE SET checkpoint=GREATEST(player_progress.checkpoint,EXCLUDED.checkpoint),best_time_ms=CASE WHEN EXCLUDED.best_time_ms IS NULL THEN player_progress.best_time_ms WHEN player_progress.best_time_ms IS NULL THEN EXCLUDED.best_time_ms ELSE LEAST(player_progress.best_time_ms,EXCLUDED.best_time_ms) END,wins=player_progress.wins+EXCLUDED.wins,updated_at=now()`,[user.id,game.rows[0].id,score,won?timeMs:null,won?1:0]);
   await client.query("INSERT INTO game_play_history(user_id,game_id,score,won,time_ms,details) VALUES($1,$2,$3,$4,$5,$6::jsonb)",[user.id,game.rows[0].id,score,won,timeMs,JSON.stringify({kills,wave,bossDamage,roomCode:code})]);
   const left=await client.query<{count:string}>("SELECT count(*)::text count FROM drone_rush_players WHERE room_id=$1 AND finished=false",[r.id]);if(Number(left.rows[0].count)===0)await client.query("UPDATE drone_rush_rooms SET status='finished',updated_at=now() WHERE id=$1",[r.id]);
  } else throw Object.assign(new Error("Aksi tidak dikenal."),{status:400});
  await client.query("COMMIT");return NextResponse.json({ok:true});
 }catch(error){await client.query("ROLLBACK");const e=error as Error&{status?:number};return NextResponse.json({error:e.message},{status:e.status||500});}finally{client.release()}
}
