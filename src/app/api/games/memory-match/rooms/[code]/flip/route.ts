import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPool } from "@/lib/db";

type Params={params:Promise<{code:string}>};
export async function POST(request:Request,{params}:Params){
  const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Harus login."},{status:401});
  const position=Number((await request.json().catch(()=>({}))).position);
  if(!Number.isInteger(position)||position<0||position>29)return NextResponse.json({error:"Kartu tidak valid."},{status:400});
  const code=(await params).code.toUpperCase(),client=await getPool().connect();
  try{
    await client.query("BEGIN");
    const room=await client.query<{id:string;status:string;current_turn_user_id:string;pending_first:number|null;pending_second:number|null}>("SELECT id::text,status,current_turn_user_id::text,pending_first,pending_second FROM memory_rooms WHERE code=$1 FOR UPDATE",[code]);
    const state=room.rows[0];if(!state)throw Object.assign(new Error("Room tidak ditemukan."),{status:404});
    if(state.status!=="playing")throw Object.assign(new Error("Permainan belum aktif."),{status:409});
    if(state.current_turn_user_id!==user.id)throw Object.assign(new Error("Tunggu giliranmu."),{status:409});
    if(state.pending_second!==null)throw Object.assign(new Error("Tunggu kartu ditutup kembali."),{status:409});
    if(state.pending_first===position)throw Object.assign(new Error("Pilih kartu yang berbeda."),{status:409});
    const picked=await client.query<{symbol:string;matched_by:string|null}>("SELECT symbol,matched_by::text FROM memory_room_cards WHERE room_id=$1 AND position=$2",[state.id,position]);
    if(!picked.rows[0]||picked.rows[0].matched_by)throw Object.assign(new Error("Kartu itu sudah ditemukan."),{status:409});
    if(state.pending_first===null){await client.query("UPDATE memory_rooms SET pending_first=$2,updated_at=now() WHERE id=$1",[state.id,position]);}
    else{
      const first=await client.query<{symbol:string}>("SELECT symbol FROM memory_room_cards WHERE room_id=$1 AND position=$2",[state.id,state.pending_first]);
      if(first.rows[0].symbol===picked.rows[0].symbol){
        await client.query("UPDATE memory_room_cards SET matched_by=$2 WHERE room_id=$1 AND position IN ($3,$4)",[state.id,user.id,state.pending_first,position]);
        await client.query("UPDATE memory_room_players SET score=score+1 WHERE room_id=$1 AND user_id=$2",[state.id,user.id]);
        const left=await client.query<{count:string}>("SELECT count(*)::text AS count FROM memory_room_cards WHERE room_id=$1 AND matched_by IS NULL",[state.id]);
        if(Number(left.rows[0].count)===0){
          const winners=await client.query<{user_id:string;score:number}>("SELECT user_id::text,score FROM memory_room_players WHERE room_id=$1 ORDER BY score DESC,seat LIMIT 2",[state.id]);
          const winner=winners.rows.length===1||winners.rows[0].score>winners.rows[1].score?winners.rows[0].user_id:null;
          await client.query("UPDATE memory_rooms SET status='finished',winner_user_id=$2,pending_first=NULL,pending_second=NULL,updated_at=now() WHERE id=$1",[state.id,winner]);
        }else await client.query("UPDATE memory_rooms SET pending_first=NULL,pending_second=NULL,updated_at=now() WHERE id=$1",[state.id]);
      }else await client.query("UPDATE memory_rooms SET pending_second=$2,resolve_at=now()+interval '1400 milliseconds',updated_at=now() WHERE id=$1",[state.id,position]);
    }
    await client.query("COMMIT");return NextResponse.json({ok:true});
  }catch(error){await client.query("ROLLBACK");const e=error as Error&{status?:number};return NextResponse.json({error:e.message},{status:e.status||500});}finally{client.release()}
}
