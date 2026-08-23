"use client";

import { useEffect, useRef } from "react";

export type BrowserSpeechStatus =
  | "idle"
  | "listening"
  | "retrying"
  | "unsupported"
  | "error";

export type BrowserSpeechTranscript = {
  text: string;
  isFinal: boolean;
};

export type BrowserSpeechDiagnostic = {
  detail: string | null;
  event: string;
  restartCount: number;
};

type BrowserSpeechTextListenerProps = {
  enabled: boolean;
  lang?: string;
  onAudioLevel?: (level: number) => void;
  onDiagnostic?: (diagnostic: BrowserSpeechDiagnostic) => void;
  onStatusChange: (status: BrowserSpeechStatus) => void;
  onTranscript: (transcript: BrowserSpeechTranscript) => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onaudioend?: (() => void) | null;
  onaudiostart?: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onnomatch?: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onsoundend?: (() => void) | null;
  onsoundstart?: (() => void) | null;
  onspeechend?: (() => void) | null;
  onspeechstart?: (() => void) | null;
  onstart?: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
};

type SpeechRecognitionWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export function BrowserSpeechTextListener({
  enabled,
  lang = "en-US",
  onAudioLevel,
  onDiagnostic,
  onStatusChange,
  onTranscript,
}: BrowserSpeechTextListenerProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioLevelFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const restartCountRef = useRef(0);
  const restartTimeoutRef = useRef<number | null>(null);
  const shouldRestartRef = useRef(false);

  useEffect(() => {
    if (!enabled || !onAudioLevel) {
      onAudioLevel?.(0);
      return;
    }

    const handleAudioLevel = onAudioLevel;
    let isCancelled = false;

    async function startAudioLevelMonitor(): Promise<void> {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const AudioContextConstructor =
          window.AudioContext ??
          (window as SpeechRecognitionWindow).webkitAudioContext;

        if (!AudioContextConstructor) {
          handleAudioLevel(0);
          return;
        }

        const audioContext = new AudioContextConstructor();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.45;
        const samples = new Uint8Array(analyser.fftSize);
        source.connect(analyser);
        audioContextRef.current = audioContext;
        mediaStreamRef.current = stream;

        function updateLevel(): void {
          analyser.getByteTimeDomainData(samples);
          let sum = 0;

          for (const sample of samples) {
            const centeredSample = sample - 128;
            sum += centeredSample * centeredSample;
          }

          const rms = Math.sqrt(sum / samples.length);
          const noiseAdjustedLevel = Math.max(0, rms - 2);
          handleAudioLevel(Math.min(1, noiseAdjustedLevel / 30));
          audioLevelFrameRef.current = window.requestAnimationFrame(updateLevel);
        }

        updateLevel();
      } catch {
        handleAudioLevel(0);
      }
    }

    void startAudioLevelMonitor();

    return () => {
      isCancelled = true;

      if (audioLevelFrameRef.current !== null) {
        window.cancelAnimationFrame(audioLevelFrameRef.current);
        audioLevelFrameRef.current = null;
      }

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      void audioContextRef.current?.close();
      audioContextRef.current = null;
      handleAudioLevel(0);
    };
  }, [enabled, onAudioLevel]);

  useEffect(() => {
    if (!enabled) {
      shouldRestartRef.current = false;
      restartCountRef.current = 0;
      if (restartTimeoutRef.current !== null) {
        window.clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      onStatusChange("idle");
      return;
    }

    const SpeechRecognition =
      (window as SpeechRecognitionWindow).SpeechRecognition ??
      (window as SpeechRecognitionWindow).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onStatusChange("unsupported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognitionRef.current = recognition;
    shouldRestartRef.current = true;

    recognition.onstart = () => {
      onDiagnostic?.({
        detail: lang,
        event: "recognition-start",
        restartCount: restartCountRef.current,
      });
    };

    recognition.onaudiostart = () => {
      onDiagnostic?.({
        detail: null,
        event: "audio-start",
        restartCount: restartCountRef.current,
      });
    };

    recognition.onaudioend = () => {
      onDiagnostic?.({
        detail: null,
        event: "audio-end",
        restartCount: restartCountRef.current,
      });
    };

    recognition.onsoundstart = () => {
      onDiagnostic?.({
        detail: null,
        event: "sound-start",
        restartCount: restartCountRef.current,
      });
    };

    recognition.onsoundend = () => {
      onDiagnostic?.({
        detail: null,
        event: "sound-end",
        restartCount: restartCountRef.current,
      });
    };

    recognition.onspeechstart = () => {
      onDiagnostic?.({
        detail: null,
        event: "speech-start",
        restartCount: restartCountRef.current,
      });
    };

    recognition.onspeechend = () => {
      onDiagnostic?.({
        detail: null,
        event: "speech-end",
        restartCount: restartCountRef.current,
      });
    };

    recognition.onnomatch = () => {
      onDiagnostic?.({
        detail: null,
        event: "no-match",
        restartCount: restartCountRef.current,
      });
    };

    recognition.onresult = (event) => {
      restartCountRef.current = 0;
      onDiagnostic?.({
        detail: `index ${event.resultIndex}, count ${event.results.length}`,
        event: "result",
        restartCount: restartCountRef.current,
      });

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript.trim();

        if (text) {
          onTranscript({
            text,
            isFinal: result.isFinal,
          });
        }
      }
    };

    recognition.onerror = (event) => {
      onDiagnostic?.({
        detail: event.error,
        event: "error",
        restartCount: restartCountRef.current,
      });

      if (event.error === "no-speech" || event.error === "aborted") {
        onStatusChange("retrying");
        return;
      }

      shouldRestartRef.current = false;
      onStatusChange("error");
    };

    recognition.onend = () => {
      onDiagnostic?.({
        detail: null,
        event: "recognition-end",
        restartCount: restartCountRef.current,
      });

      if (!shouldRestartRef.current) {
        return;
      }

      restartCountRef.current += 1;
      const restartDelay = Math.min(1200, 350 + restartCountRef.current * 150);

      if (restartTimeoutRef.current !== null) {
        window.clearTimeout(restartTimeoutRef.current);
      }

      onDiagnostic?.({
        detail: `${restartDelay}ms`,
        event: "restart-scheduled",
        restartCount: restartCountRef.current,
      });

      restartTimeoutRef.current = window.setTimeout(() => {
        restartTimeoutRef.current = null;

        if (!shouldRestartRef.current) {
          return;
        }

        try {
          recognition.start();
          onStatusChange("listening");
        } catch {
          onDiagnostic?.({
            detail: null,
            event: "restart-failed",
            restartCount: restartCountRef.current,
          });
          onStatusChange("error");
        }
      }, restartDelay);
    };

    try {
      onDiagnostic?.({
        detail: lang,
        event: "start-requested",
        restartCount: restartCountRef.current,
      });
      recognition.start();
      onStatusChange("listening");
    } catch {
      onDiagnostic?.({
        detail: null,
        event: "start-failed",
        restartCount: restartCountRef.current,
      });
      onStatusChange("error");
    }

    return () => {
      shouldRestartRef.current = false;
      restartCountRef.current = 0;
      if (restartTimeoutRef.current !== null) {
        window.clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      recognition.onaudioend = null;
      recognition.onaudiostart = null;
      recognition.onnomatch = null;
      recognition.onsoundend = null;
      recognition.onsoundstart = null;
      recognition.onspeechend = null;
      recognition.onspeechstart = null;
      recognition.onstart = null;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [enabled, lang, onDiagnostic, onStatusChange, onTranscript]);

  return null;
}
