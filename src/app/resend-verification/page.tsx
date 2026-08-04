import Link from "next/link";
import { ResendVerificationForm } from "@/components/TokenActionForm";
export default function Page(){return <main className="auth"><Link className="logo" href="/">SKY<span>VERSE</span></Link><ResendVerificationForm/></main>}
