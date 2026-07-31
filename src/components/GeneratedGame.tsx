"use client";

import { useEffect, useRef, useState } from "react";
import type { GameConfig } from "@/lib/game-builder";

type Entity = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  kind?: string;
};

export default function GeneratedGame({
  config,
  slug,
  trackProgress,
}: {
  config: GameConfig;
  slug: string;
  trackProgress: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const touchInput = useRef({ x: 0, y: 0, action: false });
  const actionQueued = useRef(false);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<"won" | "lost" | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(config.lives);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const keys = new Set<string>();
    const startedAt = performance.now();
    let raf = 0,
      last = performance.now(),
      spawn = 0,
      collected = 0,
      hp = config.lives,
      over = false,
      shotCooldown = 0,
      dashCooldown = 0;
    const player: Entity = { x: 120, y: 300, vx: 0, vy: 0, r: 20 };
    const entities: Entity[] = [];
    const bullets: Entity[] = [];
    const resize = () => {
      canvas.width = innerWidth * devicePixelRatio;
      canvas.height = innerHeight * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    resize();
    const down = (e: KeyboardEvent) => {
      keys.add(e.code);
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
          e.code,
        )
      )
        e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    addEventListener("resize", resize);
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    const finish = (won: boolean) => {
      over = true;
      if (trackProgress) {
        void fetch(`/api/games/generated/${encodeURIComponent(slug)}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score: collected,
            won,
            timeMs: Math.max(1, Math.round(performance.now() - startedAt)),
          }),
        }).catch(() => {});
      }
      setScore(collected);
      setResult(won ? "won" : "lost");
      setStarted(false);
    };
    const hit = () => {
      hp--;
      setLives(hp);
      player.x = 100;
      player.y = innerHeight / 2;
      if (hp <= 0) finish(false);
    };
    function loop(now: number) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const w = innerWidth,
        h = innerHeight,
        speed = 240 * config.speed;
      shotCooldown = Math.max(0, shotCooldown - dt);
      dashCooldown = Math.max(0, dashCooldown - dt);
      ctx.fillStyle = config.theme.background;
      ctx.fillRect(0, 0, w, h);
      const gradient = ctx.createRadialGradient(
        w * 0.7,
        h * 0.3,
        20,
        w * 0.7,
        h * 0.3,
        w * 0.7,
      );
      gradient.addColorStop(0, config.theme.primary + "55");
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 45; i++) {
        ctx.fillStyle =
          i % 4 ? `${config.theme.accent}45` : config.theme.accent;
        ctx.fillRect((i * 97 + now * 0.015) % w, (i * 53) % h, 2, 2);
      }

      if (config.template === "platformer") {
        player.vx = Math.max(-1, Math.min(1,
          (keys.has("ArrowRight") || keys.has("KeyD") ? 1 : 0) -
          (keys.has("ArrowLeft") || keys.has("KeyA") ? 1 : 0) +
          touchInput.current.x));
        player.x += player.vx * speed * dt;
        player.vy += 720 * dt;
        player.y += player.vy * dt;
        if (
          (keys.has("Space") || keys.has("ArrowUp") || actionQueued.current) &&
          player.y >= h - 80
        ) {
          player.vy = -440;
          actionQueued.current = false;
          touchInput.current.action = false;
        }
        if (player.y > h - 62) {
          player.y = h - 62;
          player.vy = 0;
        }
        player.x = Math.max(25, Math.min(w - 25, player.x));
        ctx.fillStyle = config.theme.primary;
        for (let x = 0; x < w; x += 170) {
          const y = h - 35 - ((x / 170) % 3) * 75;
          ctx.fillRect(x, y, 120, 18);
        }
      } else {
        const dx = Math.max(-1, Math.min(1,
          (keys.has("ArrowRight") || keys.has("KeyD") ? 1 : 0) -
          (keys.has("ArrowLeft") || keys.has("KeyA") ? 1 : 0) +
          touchInput.current.x));
        const dy = Math.max(-1, Math.min(1,
          (keys.has("ArrowDown") || keys.has("KeyS") ? 1 : 0) -
          (keys.has("ArrowUp") || keys.has("KeyW") ? 1 : 0) +
          touchInput.current.y));
        const boost =
          config.template === "survival" &&
          touchInput.current.action &&
          dashCooldown <= 0
            ? 2.4
            : 1;
        if (boost > 1) {
          dashCooldown = 0.8;
          touchInput.current.action = false;
        }
        player.x = Math.max(25, Math.min(w - 25, player.x + dx * speed * boost * dt));
        player.y = Math.max(80, Math.min(h - 25, player.y + dy * speed * boost * dt));
        if (
          config.template === "shooter" &&
          (keys.has("Space") || touchInput.current.action) &&
          shotCooldown <= 0
        ) {
          bullets.push({ x: player.x + 28, y: player.y, vx: 520, vy: 0, r: 7 });
          shotCooldown = 0.22;
        }
      }
      spawn -= dt;
      if (spawn <= 0) {
        spawn =
          (config.difficulty === "hard"
            ? 0.45
            : config.difficulty === "easy"
              ? 0.9
              : 0.65) / config.speed;
        const good = Math.random() > 0.48;
        entities.push({
          x: w + 30,
          y: 90 + Math.random() * (h - 130),
          vx: -(120 + Math.random() * 130) * config.speed,
          vy: config.template === "survival" ? (Math.random() - 0.5) * 80 : 0,
          r: good ? 15 : 22,
          kind: good ? "good" : "bad",
        });
      }
      for (let i = entities.length - 1; i >= 0; i--) {
        const e = entities[i];
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        if (config.template === "survival") {
          const a = Math.atan2(player.y - e.y, player.x - e.x);
          e.vx += Math.cos(a) * 30 * dt;
          e.vy += Math.sin(a) * 30 * dt;
        }
        if (e.x < -40) {
          entities.splice(i, 1);
          continue;
        }
        ctx.font = `${e.r * 1.65}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(
          e.kind === "good" ? config.collectibleEmoji : config.enemyEmoji,
          e.x,
          e.y,
        );
        if (Math.hypot(e.x - player.x, e.y - player.y) < e.r + player.r) {
          entities.splice(i, 1);
          if (e.kind === "good") {
            collected++;
            setScore(collected);
            if (collected >= config.goal) finish(true);
          } else hit();
        }
      }
      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.vx * dt;
        ctx.fillStyle = config.theme.accent;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
        ctx.fill();
        let removed = false;
        for (let j = entities.length - 1; j >= 0; j--) {
          const entity = entities[j];
          if (
            entity.kind === "bad" &&
            Math.hypot(entity.x - bullet.x, entity.y - bullet.y) <
              entity.r + bullet.r
          ) {
            entities.splice(j, 1);
            bullets.splice(i, 1);
            removed = true;
            break;
          }
        }
        if (!removed && bullet.x > w + 20) bullets.splice(i, 1);
      }
      ctx.font = "40px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(config.playerEmoji, player.x, player.y + 12);
      if (!over) raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
    };
  }, [started, config, slug, trackProgress]);

  const start = () => {
    touchInput.current = { x: 0, y: 0, action: false };
    actionQueued.current = false;
    setScore(0);
    setLives(config.lives);
    setResult(null);
    setStarted(true);
  };
  const moveJoystick = (event: React.PointerEvent<HTMLDivElement>) => {
    const base = joystickRef.current;
    if (!base) return;
    base.setPointerCapture(event.pointerId);
    const rect = base.getBoundingClientRect();
    const max = rect.width * 0.32;
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, max / length);
    const x = dx * scale;
    const y = dy * scale;
    touchInput.current.x = x / max;
    touchInput.current.y = y / max;
    if (knobRef.current)
      knobRef.current.style.transform = `translate(${x}px,${y}px)`;
  };
  const releaseJoystick = () => {
    touchInput.current.x = 0;
    touchInput.current.y = 0;
    if (knobRef.current) knobRef.current.style.transform = "translate(0,0)";
  };
  return (
    <main
      className="generatedGame"
      style={
        {
          "--game-primary": config.theme.primary,
          "--game-accent": config.theme.accent,
          "--game-bg": config.theme.background,
        } as React.CSSProperties
      }
    >
      <canvas ref={canvasRef} />
      <header>
        <b>
          SKY<span>VERSE</span>
        </b>
        <div>
          <span>
            SKOR{" "}
            <strong>
              {score}/{config.goal}
            </strong>
          </span>
          <span>
            NYAWA <strong>{"♥".repeat(lives)}</strong>
          </span>
        </div>
      </header>
      {started && (
        <div className="touchControls">
          <div
            className="virtualJoystick"
            ref={joystickRef}
            onPointerDown={moveJoystick}
            onPointerMove={(event) => {
              if (event.buttons) moveJoystick(event);
            }}
            onPointerUp={releaseJoystick}
            onPointerCancel={releaseJoystick}
          >
            <span>▲</span><span>◀</span><span>▶</span><span>▼</span>
            <div ref={knobRef} />
          </div>
          <button
            className="actionButton"
            onPointerDown={(event) => {
              touchInput.current.action = true;
              actionQueued.current = true;
              try {
                event.currentTarget.setPointerCapture(event.pointerId);
              } catch {
                // Some iOS Safari versions reject pointer capture on buttons.
                // The action must still work without capture.
              }
            }}
            onPointerUp={() => {
              touchInput.current.action = false;
              window.setTimeout(() => {
                actionQueued.current = false;
              }, 200);
            }}
            onPointerCancel={() => {
              touchInput.current.action = false;
              actionQueued.current = false;
            }}
            onClick={() => {
              // Click is a fallback for browsers that do not reliably dispatch
              // pointer events to touch controls.
              actionQueued.current = true;
              window.setTimeout(() => {
                actionQueued.current = false;
              }, 250);
            }}
          >
            <b>
              {config.template === "platformer"
                ? "↑"
                : config.template === "shooter"
                  ? "✦"
                  : "»"}
            </b>
            <small>
              {config.template === "platformer"
                ? "LOMPAT"
                : config.template === "shooter"
                  ? "TEMBAK"
                  : "DASH"}
            </small>
          </button>
        </div>
      )}
      {!started && (
        <section className="gameOverlay">
          <div>
            <small>
              {config.template.toUpperCase()} ·{" "}
              {config.difficulty.toUpperCase()}
            </small>
            <h1>{config.title}</h1>
            <p>
              {result === "won"
                ? "Hebat! Tantangan berhasil ditaklukkan."
                : result === "lost"
                  ? "Nyawa habis. Coba strategi baru!"
                  : config.description}
            </p>
            <div className="gameIcons">
              <i>{config.playerEmoji}</i>
              <b>VS</b>
              <i>{config.enemyEmoji}</i>
            </div>
            <button onClick={start}>
              {result ? "MAIN LAGI" : "MULAI GAME"} →
            </button>
            <em>Keyboard: WASD / panah · HP: joystick + tombol aksi</em>
          </div>
        </section>
      )}
    </main>
  );
}
