"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { AudioUpload } from "@/app/track/_components/audio/audio-upload";
import { showToast } from "@/components/shared/toast";
import type { ActionResult } from "@/lib/actions";
import type { MusicFileListItemData } from "@/types/music";

type TrackAudioAttachmentProps = {
  icon: ReactNode;
  onAttach: (musicFileId: string) => Promise<ActionResult<null>>;
};

export function TrackAudioAttachment({ onAttach, icon }: TrackAudioAttachmentProps) {
  const panelId = useId();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<MusicFileListItemData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAttaching, startAttaching] = useTransition();
  const isBusy = isUploading || isAttaching;

  function attach(file: MusicFileListItemData): void {
    setUploadedFile(file);
    setError(null);
    startAttaching(async () => {
      const result = await onAttach(file.id);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      showToast({
        title: "Audio attached",
        description: "Your chart and song details are unchanged.",
        tone: "success",
      });
      setUploadedFile(null);
      setIsOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={isBusy}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close MP3 upload" : "Add MP3"}
        title={isOpen ? "Close MP3 upload" : "Add MP3"}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-full border border-dashed border-[#c9c9c9] bg-white px-2 text-[11px] font-black text-[#555] transition hover:border-[#999] hover:bg-[#f4f4f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#48484e] dark:bg-[#202023] dark:text-[#d4d4d8] dark:hover:border-[#71717a] dark:hover:bg-[#29292d]"
      >
        {icon}
        <span className="hidden @[480px]/media:inline">{isOpen ? "Close upload" : "+ Add MP3"}</span>
      </button>
      {isOpen ? (
        <div
          id={panelId}
          role="region"
          aria-label="Attach audio to this track"
          aria-busy={isBusy}
          className="col-span-3 w-full rounded-xl border border-[#dedede] bg-[#fafafa] p-3 dark:border-[#3a3a3f] dark:bg-[#18181b]"
        >
          <div inert={isAttaching}>
            <AudioUpload
              embedded
              heading="Add an MP3 to this song"
              description="Upload reference audio up to 50 MB. It attaches to this track without opening the chart editor. MP3, M4A, Ogg, FLAC, and WAV are supported."
              multiple={false}
              allowOverwrite={false}
              onUploadingChange={setIsUploading}
              onUploadComplete={attach}
            />
          </div>
          {isAttaching ? (
            <p role="status" className="mt-3 text-[12px] text-[#555] dark:text-[#d4d4d8]">
              Attaching audio…
            </p>
          ) : null}
          {error ? (
            <div className="mt-3 space-y-2">
              <p role="alert" className="text-[12px] text-red-700 dark:text-red-300">{error}</p>
              {uploadedFile ? (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => attach(uploadedFile)}
                  className="h-9 rounded-full bg-[#ed1746] px-4 text-[12px] font-bold text-white transition hover:bg-[#cf123b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#ed1746] dark:text-white dark:hover:bg-[#ff315d]"
                >
                  Retry attachment
                </button>
              ) : null}
              <p className="text-[11px] text-[#777] dark:text-[#a1a1aa]">Your uploaded audio is saved. You can retry attaching it without uploading again.</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
