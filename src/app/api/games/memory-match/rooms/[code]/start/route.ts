import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { shuffledCards } from "@/lib/memory-match";

type Params={params:Promise<{code:string}>};
export async function POST(_:Request,{params}:Params){
  const user=await getCurrentUser(); if(!user)return NextResponse.json({error:"Harus login."},{status:401});
  const code=(await params).code.toUpperCase(),client=await getPool().connect();
  try{
    await client.query("BEGIN");
    await client.query("UPDATE memory_room_players p SET last_seen=now() FROM memory_rooms r WHERE r.id=p.room_id AND r.code=$1 AND p.user_id=$2",[code,user.id]);
    const room=await client.query<{id:string;host_user_id:string;status:string}>("SELECT id::text,host_user_id::text,status FROM memory_rooms WHERE code=$1 FOR UPDATE",[code]);
    const state=room.rows[0]; if(!state)throw Object.assign(new Error("Room tidak ditemukan."),{status:404});
    if(state.host_user_id!==user.id)throw Object.assign(new Error("Hanya host yang bisa memulai."),{status:403});
    if(state.status!=="waiting")throw Object.assign(new Error("Permainan sudah dimulai."),{status:409});
    const players=await client.query<{user_id:string;online:boolean}>("SELECT user_id::text,last_seen > now()-interval '60 seconds' AS online FROM memory_room_players WHERE room_id=$1 ORDER BY seat",[state.id]);
    const onlinePlayers=players.rows.filter((player)=>player.online);
    if(onlinePlayers.length<2)throw Object.assign(new Error("Minimal 2 pemain online untuk mulai."),{status:409});
    const cards=shuffledCards();
    for(let i=0;i<cards.length;i++)await client.query("INSERT INTO memory_room_cards (room_id,position,symbol) VALUES ($1,$2,$3)",[state.id,i,cards[i]]);
    await client.query("UPDATE memory_rooms SET status='playing',current_turn_user_id=$2,turn_started_at=now(),updated_at=now() WHERE id=$1",[state.id,onlinePlayers[0].user_id]);
    await client.query("COMMIT"); return NextResponse.json({ok:true});
  }catch(error){await client.query("ROLLBACK");const e=error as Error&{status?:number};return NextResponse.json({error:e.message},{status:e.status||500});}finally{client.release()}
}
