import { Link } from "react-router-dom";

import { ThemeToggle } from "../components/ThemeToggle";

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="8.5" y="14" width="7" height="7" rx="1.5" />
        <path d="M10 6.5h4M6.5 10v4.5h2M17.5 10v4.5h-2" strokeLinecap="round" />
      </svg>
    ),
    title: "Visual DAG Builder",
    desc: "Drag, drop, and wire AI agents on an infinite canvas. Build complex pipelines as naturally as drawing a diagram.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
        <circle cx="8" cy="12" r="3" />
        <circle cx="16" cy="12" r="3" />
        <path d="M11 12h2" strokeLinecap="round" />
        <path d="M5 12H2M22 12h-3" strokeLinecap="round" strokeDasharray="2 2" />
      </svg>
    ),
    title: "Multi-Model Agents",
    desc: "Mix Claude, GPT-4o, and more on the same canvas. Each node picks its own model and temperature.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
        <path d="M4 6h16M4 10h10M4 14h13M4 18h8" strokeLinecap="round" />
        <circle cx="20" cy="14" r="2" className="animate-pulse fill-current" />
      </svg>
    ),
    title: "Live Streaming",
    desc: "Watch agents think in real-time. Token-by-token output streams directly into each node on the canvas.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
        <path d="M12 3l8 5v8l-8 5-8-5V8l8-5z" />
        <path d="M12 8v8M8 10l4 2 4-2" strokeLinecap="round" />
      </svg>
    ),
    title: "Smart Collector",
    desc: "A final synthesis node merges all upstream outputs into one polished, structured result document.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
        <path d="M7 8h10M7 12h6M7 16h8" strokeLinecap="round" />
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M17 14l2 2-2 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Typed Pipelines",
    desc: "Pydantic-validated inputs and outputs at every node boundary. Structured data flows, not string parsing.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
        <path d="M13 3v7h7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 14v7h7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 10l-7-7M11 21l-7-7" strokeLinecap="round" />
      </svg>
    ),
    title: "Parallel Execution",
    desc: "Independent branches run concurrently via async orchestration. Your pipeline is only as slow as its critical path.",
  },
];

const STEPS = [
  { num: "01", title: "Create a Sandbox", desc: "Name your workspace and set shared context for all agents." },
  { num: "02", title: "Drop Agents", desc: "Drag agent templates onto the canvas and configure their roles and models." },
  { num: "03", title: "Wire the Pipeline", desc: "Connect output ports to input ports. Define the data flow between agents." },
  { num: "04", title: "Run & Stream", desc: "Hit Run and watch every agent execute live, with results streaming in real-time." },
];

const TECH = ["React", "FastAPI", "PydanticAI", "PostgreSQL", "Tailwind CSS", "Vercel"];

function HeroGraphic() {
  return (
    <div className="relative mx-auto mt-16 w-full max-w-2xl select-none" aria-hidden>
      <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-b from-canvas-accent/[0.07] to-transparent blur-3xl" />

      <svg className="absolute left-0 top-0 h-full w-full" viewBox="0 0 640 220" fill="none">
        <line x1="175" y1="72" x2="290" y2="72" stroke="url(#edgeGrad)" strokeWidth="2" strokeDasharray="6 4">
          <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" repeatCount="indefinite" />
        </line>
        <line x1="175" y1="72" x2="290" y2="152" stroke="url(#edgeGrad)" strokeWidth="2" strokeDasharray="6 4">
          <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" repeatCount="indefinite" />
        </line>
        <line x1="460" y1="72" x2="520" y2="112" stroke="url(#edgeGrad)" strokeWidth="2" strokeDasharray="6 4">
          <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" repeatCount="indefinite" />
        </line>
        <line x1="460" y1="152" x2="520" y2="112" stroke="url(#edgeGrad)" strokeWidth="2" strokeDasharray="6 4">
          <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" repeatCount="indefinite" />
        </line>
        <defs>
          <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative flex items-start justify-between px-4 py-6">
        {/* Researcher node */}
        <div className="w-[170px] rounded-2xl border border-canvas-border bg-gradient-to-b from-canvas-ink/[0.06] to-canvas-bg/25 p-3 shadow-node backdrop-blur-sm">
          <div className="flex items-center gap-2 border-b border-canvas-border pb-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.35)]" />
            <span className="text-xs font-semibold text-canvas-ink">Researcher</span>
          </div>
          <p className="mt-1.5 text-[10px] leading-snug text-canvas-muted">Deep research into the topic</p>
          <div className="mt-2 flex gap-1">
            <span className="rounded bg-canvas-ink/[0.06] px-1.5 py-0.5 font-mono text-[8px] text-canvas-accent">chatgpt</span>
            <span className="rounded bg-canvas-ink/[0.04] px-1.5 py-0.5 font-mono text-[8px] text-canvas-muted">gpt-4o</span>
          </div>
        </div>

        {/* Middle column: Writer + Critic */}
        <div className="flex flex-col gap-4 pt-0">
          <div className="w-[170px] rounded-2xl border border-canvas-border bg-gradient-to-b from-canvas-ink/[0.06] to-canvas-bg/25 p-3 shadow-node backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-canvas-border pb-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.45)]" />
              <span className="text-xs font-semibold text-canvas-ink">Writer</span>
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-canvas-muted">Structured report from research</p>
            <div className="mt-2 flex gap-1">
              <span className="rounded bg-canvas-ink/[0.06] px-1.5 py-0.5 font-mono text-[8px] text-canvas-accent">claude</span>
              <span className="rounded bg-canvas-ink/[0.04] px-1.5 py-0.5 font-mono text-[8px] text-canvas-muted">sonnet</span>
            </div>
          </div>
          <div className="w-[170px] rounded-2xl border border-canvas-border bg-gradient-to-b from-canvas-ink/[0.06] to-canvas-bg/25 p-3 shadow-node backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-canvas-border pb-2">
              <span className="h-2.5 w-2.5 rounded-full bg-canvas-muted" />
              <span className="text-xs font-semibold text-canvas-ink">Simulator</span>
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-canvas-muted">C++ simulation from params</p>
            <div className="mt-2 flex gap-1">
              <span className="rounded bg-canvas-ink/[0.06] px-1.5 py-0.5 font-mono text-[8px] text-canvas-accent">chatgpt</span>
              <span className="rounded bg-canvas-ink/[0.04] px-1.5 py-0.5 font-mono text-[8px] text-canvas-muted">gpt-4o</span>
            </div>
          </div>
        </div>

        {/* Collector node */}
        <div className="mt-10 w-[140px] rounded-2xl border border-canvas-accent/20 bg-gradient-to-br from-canvas-accent/15 via-canvas-elevated to-canvas-bg/40 p-3 shadow-node backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-canvas-accent/15 font-mono text-xs text-canvas-accent ring-1 ring-canvas-accent/25">
              ◇
            </span>
            <div>
              <div className="text-[8px] font-bold uppercase tracking-[0.15em] text-canvas-accent">Collector</div>
              <div className="text-[10px] font-semibold text-canvas-ink">Final Report</div>
            </div>
          </div>
          <p className="mt-2 text-[9px] leading-relaxed text-canvas-muted">Merges all outputs into the assembled result</p>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas-bg text-canvas-ink">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-canvas-border/50 bg-canvas-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-canvas-accent/25 to-sky-500/10 ring-1 ring-canvas-accent/25">
              <span className="font-mono text-sm font-bold text-canvas-accent">◇</span>
            </span>
            <span className="text-lg font-bold tracking-tight text-canvas-ink">AgentCanvas</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-canvas-muted md:flex">
            <a href="#features" className="transition hover:text-canvas-ink">Features</a>
            <a href="#how-it-works" className="transition hover:text-canvas-ink">How It Works</a>
            <a href="#tech" className="transition hover:text-canvas-ink">Architecture</a>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-canvas-muted transition hover:text-canvas-ink"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-gradient-to-r from-canvas-accent-dim to-canvas-accent px-4 py-2 text-sm font-semibold text-canvas-bg shadow-[0_0_20px_rgba(45,212,191,0.2)] transition hover:brightness-110"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-20 pt-24">
        <div className="pointer-events-none absolute inset-0 bg-app-radial" aria-hidden />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-canvas-accent/20 bg-canvas-accent/[0.07] px-4 py-1.5 text-xs font-medium text-canvas-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-canvas-accent" />
            Built with PydanticAI + FastAPI
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-canvas-ink sm:text-5xl lg:text-6xl">
            Orchestrate AI Agents
            <br />
            <span className="bg-gradient-to-r from-canvas-accent to-sky-400 bg-clip-text text-transparent">
              on an Infinite Canvas
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-canvas-muted">
            Build visual pipelines where AI agents collaborate. Drag nodes, wire data flows,
            and watch multi-model teams execute in real-time — with typed outputs,
            parallel branches, and live streaming.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/signup"
              className="rounded-xl bg-gradient-to-r from-canvas-accent-dim to-canvas-accent px-8 py-3.5 text-base font-semibold text-canvas-bg shadow-[0_0_40px_rgba(45,212,191,0.25)] transition hover:brightness-110"
            >
              Get Started Free
            </Link>
            <a
              href="#how-it-works"
              className="rounded-xl border border-canvas-border bg-canvas-ink/[0.03] px-8 py-3.5 text-base font-medium text-canvas-muted transition hover:border-canvas-ink/15 hover:bg-canvas-ink/[0.06]"
            >
              See How It Works
            </a>
          </div>
        </div>
        <HeroGraphic />
      </section>

      {/* Features */}
      <section id="features" className="relative px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-canvas-accent">Capabilities</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-canvas-ink sm:text-4xl">
              Everything you need to build agent pipelines
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-canvas-border bg-canvas-elevated/70 p-6 shadow-panel backdrop-blur-xl transition hover:border-canvas-accent/20 hover:shadow-[0_0_30px_rgba(45,212,191,0.06)]"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-canvas-accent/10 text-canvas-accent ring-1 ring-canvas-accent/20 transition group-hover:bg-canvas-accent/15">
                  {f.icon}
                </div>
                <h3 className="text-[15px] font-semibold text-canvas-ink">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-canvas-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative px-6 py-24">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-canvas-accent/[0.03] to-transparent" aria-hidden />
        <div className="relative mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-canvas-accent">Workflow</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-canvas-ink sm:text-4xl">
              From idea to running pipeline in minutes
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.num} className="relative text-center">
                {i < STEPS.length - 1 && (
                  <div className="pointer-events-none absolute right-0 top-8 hidden h-px w-8 translate-x-full border-t border-dashed border-canvas-accent/30 lg:block" aria-hidden />
                )}
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-canvas-accent/25 bg-canvas-accent/[0.08] font-mono text-lg font-bold text-canvas-accent shadow-[0_0_20px_rgba(45,212,191,0.1)]">
                  {s.num}
                </div>
                <h3 className="text-[15px] font-semibold text-canvas-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-canvas-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture / Tech */}
      <section id="tech" className="relative px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-canvas-accent">Under the Hood</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-canvas-ink sm:text-4xl">
              Production-grade architecture
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-canvas-muted">
              A typed, async pipeline engine built on PydanticAI and FastAPI.
              Every node boundary is schema-validated. Independent branches run in parallel.
              Results stream via SSE as agents execute.
            </p>
          </div>

          {/* Event protocol showcase */}
          <div className="mx-auto max-w-xl rounded-2xl border border-canvas-border bg-canvas-elevated/70 p-5 shadow-panel backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-canvas-muted">Live Event Stream</span>
            </div>
            <pre className="space-y-1 font-mono text-[11px] leading-relaxed">
              <code className="block text-canvas-muted">{"{"} <span className="text-canvas-accent">"type"</span>: <span className="text-sky-400">"node_start"</span>,   <span className="text-canvas-accent">"node_id"</span>: <span className="text-sky-400">"researcher"</span> {"}"}</code>
              <code className="block text-canvas-muted">{"{"} <span className="text-canvas-accent">"type"</span>: <span className="text-sky-400">"token_chunk"</span>, <span className="text-canvas-accent">"chunk"</span>: <span className="text-sky-400">"Atomic structures are..."</span> {"}"}</code>
              <code className="block text-canvas-muted">{"{"} <span className="text-canvas-accent">"type"</span>: <span className="text-sky-400">"node_complete"</span>,<span className="text-canvas-accent"> "output"</span>: {"{"} <span className="text-sky-400">...</span> {"}"} {"}"}</code>
              <code className="block text-canvas-muted">{"{"} <span className="text-canvas-accent">"type"</span>: <span className="text-sky-400">"run_complete"</span>, <span className="text-canvas-accent">"collector_output"</span>: {"{"} <span className="text-sky-400">...</span> {"}"} {"}"}</code>
            </pre>
          </div>

          {/* Tech badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {TECH.map((t) => (
              <span
                key={t}
                className="rounded-full border border-canvas-border bg-canvas-ink/[0.03] px-4 py-1.5 font-mono text-xs text-canvas-muted transition hover:border-canvas-accent/25 hover:text-canvas-accent"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative px-6 py-28">
        <div className="pointer-events-none absolute inset-0 bg-app-radial opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-canvas-ink sm:text-4xl">
            Ready to build your first agent pipeline?
          </h2>
          <p className="mt-4 text-lg text-canvas-muted">
            Create a free account and start orchestrating AI agents in minutes.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4">
            <Link
              to="/signup"
              className="rounded-xl bg-gradient-to-r from-canvas-accent-dim to-canvas-accent px-10 py-4 text-base font-semibold text-canvas-bg shadow-[0_0_50px_rgba(45,212,191,0.3)] transition hover:brightness-110"
            >
              Get Started Free
            </Link>
            <Link to="/login" className="text-sm text-canvas-muted transition hover:text-canvas-accent">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-canvas-border/50 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-canvas-muted">
            <span className="font-mono text-canvas-accent">◇</span>
            <span className="font-semibold text-canvas-muted">AgentCanvas</span>
            <span className="text-canvas-muted/50">·</span>
            <span>Built for the Cursor Hackathon</span>
          </div>
          <p className="text-xs text-canvas-muted/50">&copy; {new Date().getFullYear()} AgentCanvas. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
