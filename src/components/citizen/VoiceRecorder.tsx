"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, RotateCcw, Volume2, Check, AlertCircle } from "lucide-react";
import { api } from "@/lib/api/client";

interface VoiceRecorderProps {
  onTranscriptReady: (transcript: string, uploadId?: string) => void;
  initialTranscript?: string;
}

export function VoiceRecorder({
  onTranscriptReady,
  initialTranscript = "",
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState(initialTranscript);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    setAudioUrl(null);
    setAudioBlob(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone recording is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());

        // Process Speech to Text
        await processAudio(blob);
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      console.error("Microphone access error:", err);
      const msg = err instanceof Error ? err.message : "Microphone permission denied.";
      setError(`${msg} You can type your complaint below.`);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const processAudio = async (blob: Blob) => {
    setProcessing(true);
    setError(null);
    try {
      const res = await api.complaints.uploadVoice(blob);
      setTranscript(res.transcript);
      onTranscriptReady(res.transcript, res.upload_id);
    } catch (err: unknown) {
      console.error("STT processing error:", err);
      setError("Speech-to-text processing failed. Please type your description manually.");
    } finally {
      setProcessing(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-200">
              Voice Grievance Intake
            </h4>
            <p className="text-[11px] text-slate-400">
              Speak in English, Hindi, or local dialect to transcribe automatically
            </p>
          </div>
        </div>

        {isRecording && (
          <span className="text-xs font-mono text-rose-400 flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {formatTimer(recordingDuration)}
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Recording Control Bar */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Mic className="w-4 h-4" />
            {audioUrl ? "Record Again" : "Start Recording"}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-colors animate-pulse"
          >
            <Square className="w-4 h-4" />
            Stop Recording
          </button>
        )}

        {audioUrl && !isRecording && (
          <audio controls src={audioUrl} className="h-8 max-w-xs rounded-lg" />
        )}
      </div>

      {/* Processing Indicator */}
      {processing && (
        <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/40 text-xs text-blue-300 flex items-center gap-2 font-mono">
          <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span>Processing audio speech-to-text transcript...</span>
        </div>
      )}

      {/* Transcript Editor */}
      {transcript && (
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Generated Transcript (Editable)
            </span>
            <span>You can refine or add details below</span>
          </div>
          <textarea
            value={transcript}
            onChange={(e) => {
              setTranscript(e.target.value);
              onTranscriptReady(e.target.value);
            }}
            rows={3}
            className="w-full text-xs bg-slate-950 text-slate-200 p-3 rounded-lg border border-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            placeholder="Edit transcript if necessary..."
          />
        </div>
      )}
    </div>
  );
}
