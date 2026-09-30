"use client";

import React, { useState, useRef } from "react";
import { Camera, Image as ImageIcon, X, Sparkles, AlertCircle } from "lucide-react";
import { api } from "@/lib/api/client";
import { Category } from "@/lib/types";
import { CategoryBadge } from "../ui/CategoryBadge";

interface ImageUploaderProps {
  onImageUploaded: (uploadId: string | null, cvCategory?: Category) => void;
}

export function ImageUploader({ onImageUploaded }: ImageUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [cvPreview, setCvPreview] = useState<{
    category: Category;
    confidence: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image size must be less than 10MB.");
      return;
    }

    setError(null);
    setUploading(true);

    // Create local object URL for instant preview
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    try {
      const res = await api.complaints.uploadImage(file);
      setUploadId(res.upload_id);
      setCvPreview(res.cv_preview);
      onImageUploaded(res.upload_id, res.cv_preview.category);
    } catch (err: unknown) {
      console.error("Image upload failed:", err);
      setError("Failed to process image. You can continue with text description.");
      onImageUploaded(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setUploadId(null);
    setCvPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onImageUploaded(null);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-200">
              Visual Evidence Upload
            </h4>
            <p className="text-[11px] text-slate-400">
              Attach photo of the hazard for automated CV defect verification
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!previewUrl ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-950/50 rounded-xl p-6 text-center cursor-pointer transition-all group"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
            accept="image/*"
            className="hidden"
          />

          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-400 mx-auto mb-3 transition-colors">
            <ImageIcon className="w-5 h-5" />
          </div>

          <p className="text-xs font-semibold text-slate-300 mb-1">
            Click to upload photo or drag & drop
          </p>
          <p className="text-[11px] text-slate-400">
            PNG, JPG, WEBP up to 10MB
          </p>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-3">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-28 h-28 shrink-0 rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Complaint evidence preview"
                className="w-full h-full object-cover"
              />
              {uploading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2 text-left w-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  Evidence Uploaded
                </span>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {cvPreview && (
                <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-blue-300 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>CV Vision Detector Preview</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CategoryBadge category={cvPreview.category} size="sm" />
                    <span className="text-[10px] text-slate-400 font-mono">
                      {Math.round(cvPreview.confidence * 100)}% match
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
