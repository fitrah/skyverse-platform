import Link from "next/link";
import AuthForm from "@/components/AuthForm";
export default async function Login({searchParams}:{searchParams:Promise<{next?:string}>}){const {next}=await searchParams;return <main className="auth"><Link className="logo" href="/">SKY<span>VERSE</span></Link><AuthForm mode="login" next={next}/></main>}
