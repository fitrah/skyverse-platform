import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { query } from "@/lib/db";
type LoginUser={id:string;password_hash:string};
export async function POST(request:Request){try{const b=await request.json(),email=String(b.email??"").trim().toLowerCase(),password=String(b.password??"");const result=await query<LoginUser>("SELECT id::text,password_hash FROM users WHERE email=$1",[email]),user=result.rows[0];if(!user||!await verifyPassword(password,user.password_hash))return NextResponse.json({error:"Email atau password salah."},{status:401});await createSession(user.id);return NextResponse.json({ok:true})}catch(e){console.error(e);return NextResponse.json({error:"Gagal masuk. Coba lagi."},{status:500})}}
