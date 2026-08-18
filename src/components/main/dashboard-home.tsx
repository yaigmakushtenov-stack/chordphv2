const TRENDING_SONGS = [
  {
    title: "Riptide",
    artist: "Vance Joy",
    type: "Ukulele",
  },
  {
    title: "Let It Be",
    artist: "The Beatles",
    type: "Chords",
  },
  {
    title: "Blackbird",
    artist: "The Beatles",
    type: "Tabs",
  },
  {
    title: "Wonderwall",
    artist: "Oasis",
    type: "Chords",
  },
  {
    title: "Tatsulok",
    artist: "Bamboo",
    type: "Chords",
  },
  {
    title: "Huling El Bimbo",
    artist: "Eraserheads",
    type: "Chords",
  },
] as const;

const QUICK_ACTIONS = [
  {
    title: "Upload audio",
    description: "Add rehearsal tracks to your library.",
  },
  {
    title: "Create playlist",
    description: "Organize songs for practice sets.",
  },
  {
    title: "Browse chords",
    description: "Find tabs, lyrics, and chord diagrams.",
  },
] as const;

function MusicIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18V5l10-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </svg>
  );
}

export function DashboardHome() {
  return (
    <div className="grid gap-8">
      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[22px] font-black tracking-[-0.03em]">
            Trending songs
          </h2>
          <button
            type="button"
            className="rounded-full px-3 py-1 text-[13px] font-bold text-[#666] transition hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:text-[#b4b4bc] dark:hover:text-white"
          >
            Show all
          </button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {TRENDING_SONGS.map((song, index) => (
            <article
              key={`${song.title}-${song.artist}`}
              className="group rounded-xl bg-[#f7f7f7] p-3 transition hover:bg-[#efefef] dark:bg-[#18181b] dark:hover:bg-[#232326]"
            >
              <div className="flex aspect-square items-center justify-center rounded-lg bg-[linear-gradient(135deg,#ed1746_0%,#2d2d31_100%)] text-white shadow-[0_14px_34px_rgba(0,0,0,0.16)]">
                <span className="text-[34px] font-black tracking-[-0.06em]">
                  {index + 1}
                </span>
              </div>
              <h3 className="mt-3 truncate text-[14px] font-bold">
                {song.title}
              </h3>
              <p className="mt-1 truncate text-[13px] text-[#6f6f6f] dark:text-[#a1a1aa]">
                {song.artist}
              </p>
              <span className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#555] dark:bg-[#28282c] dark:text-[#c4c4cc]">
                {song.type}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[22px] font-black tracking-[-0.03em]">
          Start here
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <article
              key={action.title}
              className="rounded-xl border border-[#e4e4e4] bg-[#fafafa] p-5 dark:border-[#303034] dark:bg-[#18181b]"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-[#ffe2e7] text-[#ed1746] dark:bg-[#3a1720]">
                <MusicIcon />
              </div>
              <h3 className="mt-4 text-[15px] font-bold">{action.title}</h3>
              <p className="mt-2 text-[13px] leading-5 text-[#6f6f6f] dark:text-[#a1a1aa]">
                {action.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
