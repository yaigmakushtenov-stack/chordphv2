"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";

import { transposeChord } from "@/lib/chords/chord-pro";

export type SongChartLine = { id: string; text: string };
export type SongChartSection = {
  id: string;
  number: number;
  title: string;
  lines: SongChartLine[];
  showTitle?: boolean;
};

type ChordAnchor = { column: number; sourceLength: number; value: string };
type ChartRow =
  | { kind: "paired"; id: string; lineIds: string[]; lyricLineId: string; lyrics: string; chords: ChordAnchor[] }
  | { kind: "standalone"; id: string; lineIds: string[]; text: string };

type SongChartProps = {
  sections: SongChartSection[];
  activeSectionIds?: readonly string[];
  className?: string;
  fontSize?: CSSProperties["fontSize"];
  onLineElement?: (lineIds: string[], element: HTMLElement | null) => void;
  onSectionElement?: (sectionId: string, element: HTMLElement | null) => void;
  renderChord: (value: string) => ReactNode;
  renderWord?: (value: string, lineId: string, wordIndex: number) => ReactNode;
  theme?: "auto" | "dark" | "light";
};

export function SongChart({
  sections,
  activeSectionIds = [],
  className = "",
  fontSize,
  onLineElement,
  onSectionElement,
  renderChord,
  renderWord = (value) => value,
  theme = "auto",
}: SongChartProps) {
  const chartSections = useMemo(
    () => sections.map((section) => ({ ...section, rows: getChartRows(section.lines) })),
    [sections],
  );
  const surfaceClass = theme === "dark"
    ? "bg-[#202023] text-[#f5f5f5]"
    : theme === "light"
      ? "bg-[#fafafa] text-[#111]"
      : "bg-[#fafafa] text-[#111] dark:bg-[#202023] dark:text-[#f5f5f5]";
  const titleClass = theme === "dark"
    ? "bg-[#343438] text-[#d4d4d8]"
    : theme === "light"
      ? "bg-[#e9e9eb] text-[#4f4f55]"
      : "bg-[#e9e9eb] text-[#4f4f55] dark:bg-[#343438] dark:text-[#d4d4d8]";
  const borderClass = theme === "dark"
    ? "border-[#343438]"
    : theme === "light"
      ? "border-[#dedede]"
      : "border-[#dedede] dark:border-[#343438]";

  return (
    <div className={`min-w-0 space-y-5 font-mono leading-[1.5] ${className}`} style={{ fontSize }}>
      {chartSections.map((section) => {
        const active = activeSectionIds.includes(section.id);

        return (
          <section
            key={section.id}
            ref={(element) => onSectionElement?.(section.id, element)}
            className={`min-w-0 scroll-mt-20 border-l-4 pl-3 ${active ? "border-[#ed1746]" : borderClass}`}
            aria-current={active ? "true" : undefined}
          >
            {section.showTitle !== false ? (
              <div className="mb-2 flex min-w-0 items-center gap-2">
                <span className={`inline-flex max-w-full flex-wrap items-center gap-2 rounded-full px-3 py-1 text-[0.85em] font-black uppercase tracking-[0.08em] ${active ? "bg-[#ed1746] text-white" : titleClass}`}>
                  <span>{section.number}</span>
                  <span className="min-w-0 break-words">{section.title}</span>
                </span>
              </div>
            ) : null}
            <div className={`min-w-0 rounded-xl px-3 py-3 ${surfaceClass}`}>
              {section.rows.map((row) => (
                <div
                  key={row.id}
                  ref={(element) => onLineElement?.(row.lineIds, element)}
                  className="min-h-[1.5em] min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]"
                >
                  {row.kind === "paired" ? (
                    <PairedRow row={row} renderChord={renderChord} renderWord={renderWord} />
                  ) : (
                    <StandaloneRow row={row} renderChord={renderChord} renderWord={renderWord} />
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function parseSongChartSource(source: string): SongChartSection[] {
  const sections: SongChartSection[] = [];

  for (const [index, rawLine] of source.split("\n").entries()) {
    const title = getSectionTitle(rawLine);

    if (title) {
      sections.push({ id: `section-${sections.length}`, number: sections.length + 1, title, lines: [] });
      continue;
    }

    if (!sections.length) {
      sections.push({ id: "section-0", number: 1, title: "Song", showTitle: false, lines: [] });
    }

    sections[sections.length - 1].lines.push({ id: `line-${index}`, text: rawLine });
  }

  return sections.filter((section) => section.lines.some((line) => line.text.trim()));
}

function PairedRow({
  row,
  renderChord,
  renderWord,
}: {
  row: Extract<ChartRow, { kind: "paired" }>;
  renderChord: SongChartProps["renderChord"];
  renderWord: NonNullable<SongChartProps["renderWord"]>;
}) {
  const lyricCharacters = Array.from(row.lyrics);
  const lastChordColumn = Math.max(0, ...row.chords.map((chord) => chord.column + chord.sourceLength));
  const paddedLyrics = lyricCharacters
    .concat(Array(Math.max(0, lastChordColumn - lyricCharacters.length)).fill(" "))
    .join("");
  const tokens = paddedLyrics.match(/\S+|\s+/gu) ?? [];
  let column = 0;
  let wordIndex = 0;
  const parts: ReactNode[] = [];

  for (const [tokenIndex, token] of tokens.entries()) {
    const tokenStart = column;
    const tokenLength = Array.from(token).length;
    column += tokenLength;

    if (!token.trim()) {
      for (const [characterIndex, character] of Array.from(token).entries()) {
        const characterColumn = tokenStart + characterIndex;
        const chord = row.chords.find((item) => item.column === characterColumn);
        parts.push(chord ? (
          <div
            key={`${tokenIndex}-${characterIndex}`}
            className="relative inline-block min-w-[1ch] whitespace-pre pt-[1.5em] align-baseline"
            style={{ minWidth: `${Math.max(1, Array.from(chord.value).length)}ch` }}
          >
            <ChordAtColumn value={chord.value} offset={0} renderChord={renderChord} />
            {"\u00a0"}
          </div>
        ) : <span key={`${tokenIndex}-${characterIndex}`}>{character}</span>);
      }
      continue;
    }

    const wordChords = row.chords.filter(
      (item) => item.column >= tokenStart && item.column < tokenStart + tokenLength,
    );
    const chordOverhang = Math.max(
      0,
      ...wordChords.map((chord) =>
        chord.column - tokenStart + Array.from(chord.value).length - tokenLength,
      ),
    );
    parts.push(
      <div
        key={tokenIndex}
        className="relative inline-block max-w-full whitespace-normal pt-[1.5em] align-baseline [overflow-wrap:anywhere]"
        style={chordOverhang ? { paddingRight: `${chordOverhang}ch` } : undefined}
      >
        {wordChords.map((chord) => (
          <ChordAtColumn
            key={`${chord.column}-${chord.value}`}
            value={chord.value}
            offset={chord.column - tokenStart}
            renderChord={renderChord}
          />
        ))}
        {renderWord(token, row.lyricLineId, wordIndex)}
      </div>,
    );
    wordIndex += 1;
  }

  return <>{parts}</>;
}

function ChordAtColumn({ value, offset, renderChord }: {
  value: string;
  offset: number;
  renderChord: SongChartProps["renderChord"];
}) {
  return (
    <div className="absolute top-0 z-10 inline-block w-max whitespace-nowrap [&>div]:min-h-0" style={{ left: `${offset}ch` }}>
      {renderChord(value)}
    </div>
  );
}

function StandaloneRow({ row, renderChord, renderWord }: {
  row: Extract<ChartRow, { kind: "standalone" }>;
  renderChord: SongChartProps["renderChord"];
  renderWord: NonNullable<SongChartProps["renderWord"]>;
}) {
  let wordIndex = 0;
  const parts = row.text.match(/\[[^\]\r\n]+\]|\S+|\s+/gu) ?? [];
  const chordLine = getChordAnchors(row.text).length > 0;
  const renderedParts: ReactNode[] = [];

  for (const [index, part] of parts.entries()) {
    if (!part.trim()) {
      renderedParts.push(<span key={index}>{part}</span>);
      continue;
    }
    if (part.startsWith("[") && part.endsWith("]")) {
      const value = part.slice(1, -1).trim();
      renderedParts.push(transposeChord(value, 0, "sharps")
        ? <div key={index} className="inline-block max-w-full align-baseline">{renderChord(value)}</div>
        : <strong key={index} className="inline-block max-w-full break-all">{value}</strong>);
      continue;
    }
    if (chordLine && transposeChord(part, 0, "sharps")) {
      renderedParts.push(<div key={index} className="inline-block max-w-full align-baseline">{renderChord(part)}</div>);
      continue;
    }
    renderedParts.push(<span key={index}>{renderWord(part, row.id, wordIndex)}</span>);
    wordIndex += 1;
  }

  return <>{renderedParts}</>;
}

function getChartRows(lines: SongChartLine[]): ChartRow[] {
  const rows: ChartRow[] = [];
  const normalizedLines = lines.map((line) => ({
    ...line,
    text: expandTabs(line.text),
  }));

  for (let index = 0; index < normalizedLines.length; index += 1) {
    const line = normalizedLines[index];
    const nextLine = normalizedLines[index + 1];
    const chords = getChordAnchors(line.text);

    if (chords.length && nextLine?.text.trim() && !getChordAnchors(nextLine.text).length && !getSectionTitle(nextLine.text) && !/\[[^\]\r\n]+\]/.test(nextLine.text)) {
      rows.push({ kind: "paired", id: line.id, lineIds: [line.id, nextLine.id], lyricLineId: nextLine.id, lyrics: nextLine.text, chords });
      index += 1;
      continue;
    }

    const inline = getInlineChordAnchors(line.text);
    if (inline) {
      rows.push({ kind: "paired", id: line.id, lineIds: [line.id], lyricLineId: line.id, lyrics: inline.lyrics, chords: inline.chords });
      continue;
    }

    rows.push({ kind: "standalone", id: line.id, lineIds: [line.id], text: line.text });
  }

  return rows;
}

function getInlineChordAnchors(line: string): { lyrics: string; chords: ChordAnchor[] } | null {
  const matches = [...line.matchAll(/\[([^\]\r\n]+)\]/g)];
  if (!matches.length || matches.some((match) => !transposeChord(match[1].trim(), 0, "sharps"))) return null;
  if (!line.replace(/\[[^\]\r\n]+\]/g, "").trim()) return null;

  let lyrics = "";
  let start = 0;
  const chords: ChordAnchor[] = [];

  for (const match of matches) {
    lyrics += line.slice(start, match.index);
    chords.push({ column: Array.from(lyrics).length, sourceLength: 1, value: match[1].trim() });
    start = match.index + match[0].length;
  }

  lyrics += line.slice(start);
  return { lyrics, chords };
}

function getChordAnchors(line: string): ChordAnchor[] {
  const matches = [...line.matchAll(/\[([^\]\r\n]+)\]/g)];
  if (matches.length) {
    if (line.replace(/\[[^\]\r\n]+\]/g, "").trim() || matches.some((match) => !transposeChord(match[1].trim(), 0, "sharps"))) return [];
    return matches.map((match) => ({ column: Array.from(line.slice(0, match.index)).length, sourceLength: Array.from(match[0]).length, value: match[1].trim() }));
  }

  const words = [...line.matchAll(/\S+/g)];
  if (!words.length || words.some((word) => !transposeChord(word[0], 0, "sharps"))) return [];
  return words.map((word) => ({ column: Array.from(line.slice(0, word.index)).length, sourceLength: Array.from(word[0]).length, value: word[0] }));
}

function getSectionTitle(line: string): string | null {
  const match = /^\s*\[([^\]\r\n]+)\]\s*$/.exec(line);
  if (!match) return null;
  const value = match[1].trim();
  return transposeChord(value, 0, "sharps") ? null : value;
}

function expandTabs(line: string): string {
  let expanded = "";
  let column = 0;
  for (const character of line) {
    if (character === "\t") {
      const spaces = 4 - (column % 4);
      expanded += " ".repeat(spaces);
      column += spaces;
    } else {
      expanded += character;
      column += 1;
    }
  }
  return expanded;
}
