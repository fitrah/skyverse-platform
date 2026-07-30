"use client";

import { useEffect, useRef, useState } from "react";
import type { GameConfig } from "@/lib/game-builder";

type Entity = { x: number; y: number; vx: number; vy: number; r: number; kind?: string };

export default function GeneratedGame({ config }: { config: GameConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<"won" | "lost" | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(config.lives);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const keys = new Set<string>();
    let raf = 0, last = performance.now(), spawn = 0, collected = 0, hp = config.lives, over = false;
    const player: Entity = { x: 120, y: 300, vx: 0, vy: 0, r: 20 };
    const entities: Entity[] = [];
    const resize = () => { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); };
    resize();
    const down = (e: KeyboardEvent) => { keys.add(e.code); if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault(); };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    addEventListener("resize", resize); addEventListener("keydown", down); addEventListener("keyup", up);
    const pointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      player.x = e.clientX - rect.left; player.y = e.clientY - rect.top;
    };
    canvas.addEventListener("pointermove", pointer);

    const finish = (won: boolean) => { over = true; setScore(collected); setResult(won ? "won" : "lost"); setStarted(false); };
    const hit = () => { hp--; setLives(hp); player.x = 100; player.y = innerHeight / 2; if (hp <= 0) finish(false); };
    function loop(now: number) {
      const dt = Math.min(.033, (now - last) / 1000); last = now;
      const w = innerWidth, h = innerHeight, speed = 240 * config.speed;
      ctx.fillStyle = config.theme.background; ctx.fillRect(0, 0, w, h);
      const gradient = ctx.createRadialGradient(w*.7,h*.3,20,w*.7,h*.3,w*.7);
      gradient.addColorStop(0, config.theme.primary + "55"); gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient; ctx.fillRect(0,0,w,h);
      for (let i=0;i<45;i++){ctx.fillStyle=i%4?`${config.theme.accent}45`:config.theme.accent;ctx.fillRect((i*97+now*.015)%w,(i*53)%h,2,2)}

      if (config.template === "platformer") {
        player.vx = (keys.has("ArrowRight")||keys.has("KeyD")?1:0)-(keys.has("ArrowLeft")||keys.has("KeyA")?1:0);
        player.x += player.vx * speed * dt; player.vy += 720*dt; player.y += player.vy*dt;
        if ((keys.has("Space")||keys.has("ArrowUp")) && player.y >= h-80) player.vy=-440;
        if(player.y>h-62){player.y=h-62;player.vy=0} player.x=Math.max(25,Math.min(w-25,player.x));
        ctx.fillStyle=config.theme.primary;for(let x=0;x<w;x+=170){const y=h-35-(x/170%3)*75;ctx.fillRect(x,y,120,18)}
      } else {
        const dx=(keys.has("ArrowRight")||keys.has("KeyD")?1:0)-(keys.has("ArrowLeft")||keys.has("KeyA")?1:0);
        const dy=(keys.has("ArrowDown")||keys.has("KeyS")?1:0)-(keys.has("ArrowUp")||keys.has("KeyW")?1:0);
        player.x=Math.max(25,Math.min(w-25,player.x+dx*speed*dt));player.y=Math.max(80,Math.min(h-25,player.y+dy*speed*dt));
      }
      spawn -= dt;
      if(spawn<=0){spawn=(config.difficulty==="hard"?.45:config.difficulty==="easy"?.9:.65)/config.speed;const good=Math.random()>.48;entities.push({x:w+30,y:90+Math.random()*(h-130),vx:-(120+Math.random()*130)*config.speed,vy:config.template==="survival"?(Math.random()-.5)*80:0,r:good?15:22,kind:good?"good":"bad"})}
      for(let i=entities.length-1;i>=0;i--){const e=entities[i];e.x+=e.vx*dt;e.y+=e.vy*dt;if(config.template==="survival"){const a=Math.atan2(player.y-e.y,player.x-e.x);e.vx+=Math.cos(a)*30*dt;e.vy+=Math.sin(a)*30*dt}if(e.x<-40){entities.splice(i,1);continue}ctx.font=`${e.r*1.65}px sans-serif`;ctx.textAlign="center";ctx.fillText(e.kind==="good"?config.collectibleEmoji:config.enemyEmoji,e.x,e.y);if(Math.hypot(e.x-player.x,e.y-player.y)<e.r+player.r){entities.splice(i,1);if(e.kind==="good"){collected++;setScore(collected);if(collected>=config.goal)finish(true)}else hit()}}
      ctx.font="40px sans-serif";ctx.textAlign="center";ctx.fillText(config.playerEmoji,player.x,player.y+12);
      if(!over) raf=requestAnimationFrame(loop);
    }
    raf=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(raf);removeEventListener("resize",resize);removeEventListener("keydown",down);removeEventListener("keyup",up);canvas.removeEventListener("pointermove",pointer)};
  }, [started, config]);

  const start = () => { setScore(0); setLives(config.lives); setResult(null); setStarted(true); };
  return <main className="generatedGame" style={{"--game-primary":config.theme.primary,"--game-accent":config.theme.accent,"--game-bg":config.theme.background} as React.CSSProperties}>
    <canvas ref={canvasRef}/>
    <header><b>SKY<span>VERSE</span></b><div><span>SKOR <strong>{score}/{config.goal}</strong></span><span>NYAWA <strong>{"♥".repeat(lives)}</strong></span></div></header>
    {!started&&<section className="gameOverlay"><div><small>{config.template.toUpperCase()} · {config.difficulty.toUpperCase()}</small><h1>{config.title}</h1><p>{result==="won"?"Hebat! Tantangan berhasil ditaklukkan.":result==="lost"?"Nyawa habis. Coba strategi baru!":config.description}</p><div className="gameIcons"><i>{config.playerEmoji}</i><b>VS</b><i>{config.enemyEmoji}</i></div><button onClick={start}>{result?"MAIN LAGI":"MULAI GAME"} →</button><em>Keyboard: WASD / panah · HP: sentuh dan geser</em></div></section>}
  </main>;
}
