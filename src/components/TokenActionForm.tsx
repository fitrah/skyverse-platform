"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export function VerifyEmailForm({ token }: { token: string }) {
  const [message,setMessage]=useState("Memverifikasi email...");
  useEffect(()=>{fetch("/api/auth/verify-email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})}).then(async r=>{const b=await r.json();setMessage(r.ok?"Email berhasil diverifikasi. Sekarang kamu bisa masuk.":b.error)}).catch(()=>setMessage("Verifikasi gagal."))},[token]);
  return <form><h1>Verifikasi Email</h1><p>{message}</p><Link href="/login">Kembali ke halaman masuk</Link></form>;
}

export function ForgotPasswordForm(){const [message,setMessage]=useState("");async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const data=new FormData(e.currentTarget);await fetch("/api/auth/forgot-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:data.get("email")})});setMessage("Jika email terdaftar, tautan reset sudah dikirim.")}return <form onSubmit={submit}><h1>Lupa Password</h1><label>Email<input name="email" type="email" required autoComplete="email"/></label><button>KIRIM TAUTAN RESET</button>{message&&<p>{message}</p>}<p><Link href="/login">Kembali masuk</Link></p></form>}

export function ResendVerificationForm(){const [message,setMessage]=useState("");async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const data=new FormData(e.currentTarget);await fetch("/api/auth/resend-verification",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:data.get("email")})});setMessage("Jika akun belum aktif, email verifikasi sudah dikirim ulang.")}return <form onSubmit={submit}><h1>Kirim Ulang Verifikasi</h1><label>Email<input name="email" type="email" required autoComplete="email"/></label><button>KIRIM ULANG</button>{message&&<p>{message}</p>}<p><Link href="/login">Kembali masuk</Link></p></form>}

export function ResetPasswordForm({token}:{token:string}){const [message,setMessage]=useState("");async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const data=new FormData(e.currentTarget),password=String(data.get("password")??""),response=await fetch("/api/auth/reset-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,password})}),body=await response.json();setMessage(response.ok?"Password berhasil diganti. Silakan masuk kembali.":body.error)}return <form onSubmit={submit}><h1>Password Baru</h1><label>Password<input name="password" type="password" minLength={8} required autoComplete="new-password"/></label><button>SIMPAN PASSWORD</button>{message&&<p>{message}</p>}<p><Link href="/login">Ke halaman masuk</Link></p></form>}
