import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
export async function GET(){const user=await getCurrentUser();return NextResponse.json(user?{authenticated:true,user:{username:user.username,avatarId:user.avatar_id,coins:user.coins}}:{authenticated:false},{status:user?200:401})}
