import Link from "next/link";
import AuthForm from "@/components/AuthForm";
export default async function Register({searchParams}:{searchParams:Promise<{next?:string}>}){const {next}=await searchParams;return <main className="auth"><Link className="logo" href="/">SKY<span>VERSE</span></Link><AuthForm mode="register" next={next}/></main>}
