"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { GA_ID } from "@/lib/analytics";

export default function GoogleAnalytics({userId}:{userId?:string}) {
  const pathname=usePathname(),[consent,setConsent]=useState<"granted"|"denied"|null>(null),[ready,setReady]=useState(false);
  useEffect(()=>{const timer=window.setTimeout(()=>setConsent(localStorage.getItem("skyverse_analytics_consent") as "granted"|"denied"|null),0);return()=>window.clearTimeout(timer)},[]);
  useEffect(()=>{if(consent!=="granted"||!ready||!window.gtag)return;window.gtag("set",{user_id:userId??null});window.gtag("event","page_view",{page_path:pathname,page_location:window.location.href})},[pathname,consent,userId,ready]);
  function choose(value:"granted"|"denied"){localStorage.setItem("skyverse_analytics_consent",value);setConsent(value);if(value==="granted")window.location.reload()}
  return <>{consent==="granted"&&<><Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive"/><Script id="skyverse-ga" strategy="afterInteractive" onReady={()=>setReady(true)}>{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:false${userId?`,user_id:'${userId}'`:""}});`}</Script></>}{consent===null&&<aside className="consentBanner"><p>Skyverse menggunakan analytics untuk memahami kunjungan dan meningkatkan pengalaman bermain. Kami tidak mengirim email, password, atau data pribadi ke Google.</p><div><button onClick={()=>choose("denied")}>TOLAK</button><button className="accept" onClick={()=>choose("granted")}>IZINKAN</button></div></aside>}</>;
}
