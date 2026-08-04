import Link from "next/link";
import { VerifyEmailForm } from "@/components/TokenActionForm";
export default async function Page({searchParams}:{searchParams:Promise<{token?:string}>}){const {token=""}=await searchParams;return <main className="auth"><Link className="logo" href="/">SKY<span>VERSE</span></Link><VerifyEmailForm token={token}/></main>}
