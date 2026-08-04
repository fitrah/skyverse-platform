"use client";
import { InputHTMLAttributes, useState } from "react";

export default function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible,setVisible]=useState(false);
  return <span className="passwordInput"><input {...props} type={visible?"text":"password"}/><button type="button" className="passwordEye" onClick={()=>setVisible(!visible)} aria-label={visible?"Sembunyikan password":"Tampilkan password"} title={visible?"Sembunyikan password":"Tampilkan password"}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.7"/>{visible&&<path d="M4 4l16 16"/>}</svg></button></span>;
}
