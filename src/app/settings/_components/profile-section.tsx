"use client";

import { useRef, useState, type ChangeEvent } from "react";

import {
  fieldLabelClassName,
  inputClassName,
  SettingsSection,
} from "@/app/settings/_components/settings-section";

type ProfileSectionProps = {
  displayName: string;
  image: string | null;
  onDisplayNameChange: (displayName: string) => void;
  onImageChange: (image: string | null) => void;
};

const MAX_PREVIEW_BYTES = 5 * 1024 * 1024;

export function ProfileSection({
  displayName,
  image,
  onDisplayNameChange,
  onImageChange,
}: ProfileSectionProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/") || file.size > MAX_PREVIEW_BYTES) {
      setPhotoError("Choose an image smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        onImageChange(reader.result);
        setPhotoError(null);
      }
    });
    reader.readAsDataURL(file);
  }

  return (
    <SettingsSection
      title="Profile"
      description="Choose how bandmates see you across ChordPH."
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <ProfileAvatar image={image} name={displayName} />
        </div>
        <div className="min-w-0 flex-1 space-y-5">
          <div>
            <label htmlFor="display-name" className={fieldLabelClassName}>
              Display name
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              maxLength={80}
              autoComplete="name"
              onChange={(event) => onDisplayNameChange(event.target.value)}
              className={inputClassName}
            />
            <p className="mt-2 text-[11px] leading-4 text-[#777] dark:text-[#92929a]">
              This is the name shown to your bands and collaborators.
            </p>
          </div>

          <div>
            <span className={fieldLabelClassName}>Profile photo</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhotoChange}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex h-9 items-center rounded-full bg-[#111] px-4 text-[12px] font-bold text-white transition hover:bg-[#2c2c2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-white dark:text-[#111] dark:hover:bg-[#e4e4e7]"
              >
                Choose photo
              </button>
              {image ? (
                <button
                  type="button"
                  onClick={() => {
                    onImageChange(null);
                    setPhotoError(null);
                    if (inputRef.current) {
                      inputRef.current.value = "";
                    }
                  }}
                  className="inline-flex h-9 items-center rounded-full px-4 text-[12px] font-bold text-[#666] transition hover:bg-[#f2f2f2] hover:text-[#111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:text-[#b4b4bc] dark:hover:bg-[#252528] dark:hover:text-white"
                >
                  Remove
                </button>
              ) : null}
            </div>
            {photoError ? (
              <p role="alert" className="mt-2 text-[11px] font-semibold text-[#c90f39] dark:text-[#fb7185]">
                {photoError}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}

function ProfileAvatar({ image, name }: { image: string | null; name: string }) {
  if (image) {
    return (
      <span
        role="img"
        aria-label={`${name || "User"} profile preview`}
        className="block size-20 rounded-full border border-[#dedede] bg-cover bg-center bg-no-repeat shadow-sm dark:border-[#404045]"
        style={{ backgroundImage: `url(${JSON.stringify(image)})` }}
      />
    );
  }

  return (
    <span className="flex size-20 items-center justify-center rounded-full bg-[#ed1746] text-[22px] font-black text-white shadow-sm">
      {getInitials(name)}
    </span>
  );
}

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}
