"use client";
import { FormEvent, useState } from "react";
import PasswordInput from "@/components/PasswordInput";

export default function ChangePasswordForm() {
  const [open,setOpen]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState(""),[loading,setLoading]=useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); setError(""); setLoading(true);
    const form=event.currentTarget,data=new FormData(form),newPassword=String(data.get("newPassword")??""),confirmation=String(data.get("confirmation")??"");
    if(newPassword!==confirmation){setError("Konfirmasi password baru tidak sama.");setLoading(false);return}
    try{const response=await fetch("/api/auth/change-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({currentPassword:data.get("currentPassword"),newPassword})}),body=await response.json();if(!response.ok)throw new Error(body.error??"Gagal mengganti password.");form.reset();setMessage("Password berhasil diganti. Sesi di perangkat lain sudah dikeluarkan.")}catch(err){setError(err instanceof Error?err.message:"Gagal mengganti password.")}finally{setLoading(false)}
  }
  return <div className="passwordPanel"><button className="passwordToggle" type="button" onClick={()=>setOpen(!open)}>{open?"TUTUP":"GANTI PASSWORD"}</button>{open&&<form onSubmit={submit}><label>Password lama<PasswordInput name="currentPassword" required autoComplete="current-password"/></label><label>Password baru<PasswordInput name="newPassword" required minLength={8} autoComplete="new-password"/></label><label>Ulangi password baru<PasswordInput name="confirmation" required minLength={8} autoComplete="new-password"/></label>{error&&<p className="passwordError">{error}</p>}{message&&<p className="passwordSuccess">{message}</p>}<button disabled={loading}>{loading?"MENYIMPAN...":"SIMPAN PASSWORD"}</button></form>}</div>;
}
