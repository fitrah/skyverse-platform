"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

type Project = {
  id: string;
  slug: string;
  title: string;
  prompt: string;
  template: string;
  status: string;
  config: unknown;
};

const examples = [
  "Buat game pesawat luar angkasa, hindari meteor, kumpulkan 15 bintang, 3 nyawa",
  "Buat platformer kucing di dunia permen, mudah untuk anak-anak",
  "Buat survival robot di hutan neon, kumpulkan 20 kristal, tingkat sulit",
];

export default function GameBuilder() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [prompt, setPrompt] = useState("");
  const [revision, setRevision] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadProjects() {
    const response = await fetch("/api/builder/projects");
    if (response.ok) {
      const data = await response.json();
      setProjects(data.projects);
      setSelected((current) => current ?? data.projects[0] ?? null);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/builder/projects")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        if (!active) return;
        setProjects(data.projects);
        setSelected(data.projects[0] ?? null);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  async function generate(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/builder/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPrompt("");
      trackEvent("game_create",{template:data.project.template});
      await loadProjects();
      setSelected({ ...data.project, prompt, config: data.project });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal membuat game.");
    } finally { setLoading(false); }
  }

  async function revise(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/builder/projects/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: revision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRevision("");
      await loadProjects();
      setSelected((current) => current ? { ...current, ...data.project, config: data.project } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal merevisi game.");
    } finally { setLoading(false); }
  }

  async function publish() {
    if (!selected) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/builder/projects/${selected.id}/publish`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      trackEvent("game_publish",{template:selected.template});
      await loadProjects();
      setSelected({ ...selected, status: "published" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal memublikasikan game.");
    } finally { setLoading(false); }
  }

  return (
    <div className="builderShell">
      <aside className="builderSidebar">
        <Link className="logo" href="/">SKY<span>VERSE</span></Link>
        <div>
          <small>GAME BUATANKU</small>
          <button className={!selected ? "active" : ""} onClick={() => setSelected(null)}>＋ Game baru</button>
          {projects.map((project) => (
            <button className={selected?.id === project.id ? "active" : ""} key={project.id} onClick={() => setSelected(project)}>
              <span>{project.template === "shooter" ? "🚀" : project.template === "platformer" ? "🏃" : "💎"}</span>
              <b>{project.title}</b>
              <em>{project.status === "published" ? "LIVE" : "DRAFT"}</em>
            </button>
          ))}
        </div>
        <Link className="backHome" href="/">← Kembali ke Skyverse</Link>
      </aside>

      <main className="builderMain">
        {!selected ? (
          <section className="promptPanel">
            <small>SKYVERSE CREATOR</small>
            <h1>Bayangkan game.<br/><span>Kami buatkan.</span></h1>
            <p>Ceritakan karakter, dunia, tantangan, dan aturan game yang Bang inginkan.</p>
            <form onSubmit={generate}>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} minLength={12} maxLength={1000}
                placeholder="Contoh: Buat game pesawat di luar angkasa. Hindari meteor dan kumpulkan 15 bintang..." required />
              <div><span>{prompt.length}/1000</span><button disabled={loading}>{loading ? "MEMBUAT..." : "✨ BUAT GAME"}</button></div>
            </form>
            {error && <p className="builderError">{error}</p>}
            <div className="promptExamples"><small>COBA CONTOH</small>{examples.map((item) => <button key={item} onClick={() => setPrompt(item)}>{item}</button>)}</div>
          </section>
        ) : (
          <section className="studio">
            <header>
              <div><small>{selected.template.toUpperCase()} · {selected.status.toUpperCase()}</small><h1>{selected.title}</h1></div>
              <div>
                {selected.status === "published" && <Link href={`/play/${selected.slug}`} target="_blank">Buka game ↗</Link>}
                <button onClick={publish} disabled={loading}>{selected.status === "published" ? "PUBLIKASIKAN ULANG" : "PUBLIKASIKAN"}</button>
              </div>
            </header>
            <div className="previewFrame">
              <iframe key={`${selected.id}-${selected.title}`} src={`/play/${selected.slug}?preview=1`} sandbox="allow-scripts" title={`Preview ${selected.title}`} />
            </div>
            <form className="revisionBar" onSubmit={revise}>
              <input value={revision} onChange={(e) => setRevision(e.target.value)} minLength={12} maxLength={1000}
                placeholder="Minta revisi: ganti pemain jadi robot, tambah nyawa jadi 5..." required />
              <button disabled={loading}>↻ REVISI</button>
            </form>
            {error && <p className="builderError">{error}</p>}
          </section>
        )}
      </main>
    </div>
  );
}
