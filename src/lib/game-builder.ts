import "server-only";

export type GameTemplate = "platformer" | "shooter" | "survival";

export interface GameConfig {
  title: string;
  description: string;
  template: GameTemplate;
  theme: {
    background: string;
    primary: string;
    accent: string;
    player: string;
  };
  playerEmoji: string;
  enemyEmoji: string;
  collectibleEmoji: string;
  goal: number;
  lives: number;
  speed: number;
  difficulty: "easy" | "medium" | "hard";
}

const colors = {
  ocean: ["#071a2e", "#35c6e8", "#ffdf70", "#89f1ff"],
  space: ["#100d2e", "#9d67ff", "#57e6ff", "#f5eaff"],
  forest: ["#10271f", "#59c77b", "#ffd166", "#dfffe8"],
  candy: ["#421b4d", "#ff78b7", "#77e5e2", "#fff0f8"],
  desert: ["#382311", "#e8a64d", "#66d2d5", "#fff1c7"],
  neon: ["#090b21", "#7b61ff", "#23f0c7", "#f3f1ff"],
} as const;

const contains = (text: string, words: string[]) => words.some((word) => text.includes(word));

function templateFrom(text: string): GameTemplate {
  if (contains(text, ["tembak", "pesawat", "kapal", "shooter", "laser", "peluru"])) return "shooter";
  if (contains(text, ["lompat", "platform", "obby", "parkour", "rintangan"])) return "platformer";
  return "survival";
}

function titleFrom(prompt: string, template: GameTemplate) {
  const quoted = prompt.match(/["“](.{3,60})["”]/)?.[1];
  if (quoted) return quoted.trim();
  const clean = prompt
    .replace(/\b(tolong|buatkan?|bikin(?:kan)?|game|permainan|yang|dengan|tema)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length >= 3) return clean.split(/[,.]/)[0].slice(0, 54).replace(/\b\w/g, (v) => v.toUpperCase());
  return template === "shooter" ? "Star Blaster" : template === "platformer" ? "Cloud Jumper" : "Crystal Rush";
}

export function generateGameConfig(prompt: string): GameConfig {
  const text = prompt.toLowerCase();
  const template = templateFrom(text);
  const paletteKey = contains(text, ["laut", "ikan", "ocean", "air"]) ? "ocean"
    : contains(text, ["hutan", "pohon", "forest", "dino"]) ? "forest"
    : contains(text, ["permen", "candy", "pink"]) ? "candy"
    : contains(text, ["gurun", "pasir", "desert"]) ? "desert"
    : contains(text, ["luar angkasa", "planet", "meteor", "space"]) ? "space"
    : "neon";
  const [background, primary, accent, player] = colors[paletteKey];
  const difficulty = contains(text, ["sulit", "hard", "susah"]) ? "hard"
    : contains(text, ["mudah", "easy", "anak"]) ? "easy"
    : "medium";
  const number = (pattern: RegExp, fallback: number) => {
    const value = Number(text.match(pattern)?.[1]);
    return Number.isFinite(value) ? value : fallback;
  };
  const lives = Math.max(1, Math.min(9, number(/(\d+)\s*(?:nyawa|lives?)/, 3)));
  const goal = Math.max(5, Math.min(50, number(/(?:kumpulkan|target|skor)\s*(\d+)/, template === "platformer" ? 8 : 15)));
  const playerEmoji = contains(text, ["pesawat", "kapal"]) ? "🚀"
    : contains(text, ["kucing"]) ? "🐱"
    : contains(text, ["dino"]) ? "🦖"
    : contains(text, ["robot"]) ? "🤖"
    : contains(text, ["penyihir"]) ? "🧙"
    : "🧑‍🚀";
  const enemyEmoji = contains(text, ["meteor"]) ? "☄️"
    : contains(text, ["zombie"]) ? "🧟"
    : contains(text, ["hantu"]) ? "👻"
    : contains(text, ["monster"]) ? "👾"
    : "🔺";
  const collectibleEmoji = contains(text, ["koin"]) ? "🪙"
    : contains(text, ["bintang"]) ? "⭐"
    : contains(text, ["buah"]) ? "🍎"
    : "💎";
  const title = titleFrom(prompt, template);
  return {
    title,
    description: `Game ${template} buatan komunitas: ${prompt.slice(0, 180)}`,
    template,
    theme: { background, primary, accent, player },
    playerEmoji,
    enemyEmoji,
    collectibleEmoji,
    goal,
    lives,
    speed: difficulty === "easy" ? 0.8 : difficulty === "hard" ? 1.35 : 1,
    difficulty,
  };
}

export function safeSlug(title: string) {
  const base = title.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").slice(0, 64);
  return `${base || "game"}-${crypto.randomUUID().slice(0, 8)}`;
}
