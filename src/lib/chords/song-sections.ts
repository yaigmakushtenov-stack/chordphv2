import { transposeChord } from "@/lib/chords/chord-pro";

export type SectionOperation =
  | { type: "duplicate"; sectionIndex: number }
  | { type: "delete"; sectionIndex: number }
  | { type: "move"; sectionIndex: number; targetIndex: number };

export function getSectionTitle(line: string): string | null {
  const match = /^\s*\[([^\]\r\n]+)\]\s*$/.exec(line);
  if (!match) return null;
  const value = match[1].trim();
  return transposeChord(value, 0, "sharps") ? null : value;
}

export function changeSongSections(source: string, operation: SectionOperation): string | null {
  const sections: { header: string | null; lines: string[] }[] = [];
  for (const line of source.split("\n")) {
    if (getSectionTitle(line)) {
      sections.push({ header: line, lines: [] });
    } else {
      if (!sections.length) sections.push({ header: null, lines: [] });
      sections[sections.length - 1].lines.push(line);
    }
  }
  const selected = sections[operation.sectionIndex];
  if (!Number.isInteger(operation.sectionIndex) || !selected?.lines.some((line) => line.trim())) return null;
  if (operation.type === "duplicate") {
    sections.splice(operation.sectionIndex + 1, 0, { ...selected, lines: [...selected.lines] });
  } else if (operation.type === "delete") {
    sections.splice(operation.sectionIndex, 1);
  } else {
    if (!Number.isInteger(operation.targetIndex) || !sections[operation.targetIndex]?.lines.some((line) => line.trim())) return null;
    if (operation.sectionIndex === operation.targetIndex) return source;
    sections.splice(operation.sectionIndex, 1);
    sections.splice(operation.targetIndex, 0, selected);
  }
  const result = sections.flatMap((section, index) => [
    ...(section.header ? [section.header] : index > 0 ? ["[Song]"] : []),
    ...section.lines,
  ]).join("\n");
  return result.length <= 100_000 ? result : null;
}
