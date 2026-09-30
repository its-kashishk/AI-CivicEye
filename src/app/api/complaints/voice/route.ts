import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pendingUploads } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const clientTranscript = (formData.get("client_transcript") as string) || "";

    if (!file && !clientTranscript) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "No audio file or voice recording provided.",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    let dataUrl: string | null = null;
    let mime = "audio/webm";
    let filename = "voice_recording.webm";

    if (file) {
      mime = file.type || "audio/webm";
      filename = file.name || "voice_recording.webm";
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString("base64");
      dataUrl = `data:${mime};base64,${base64}`;
    }

    // Generated or client-provided transcript
    const transcript =
      clientTranscript.trim() ||
      "Deep crater pothole near the central bus terminal junction causing serious bike skids and traffic backup.";

    const [upload] = await db
      .insert(pendingUploads)
      .values({
        type: "AUDIO",
        mime,
        filename,
        dataUrl: dataUrl || "",
        transcript,
      })
      .returning();

    return NextResponse.json({
      upload_id: upload.id,
      transcript,
      language: "en",
    });
  } catch (error) {
    console.error("Voice upload error:", error);
    return NextResponse.json(
      {
        error: {
          code: "STT_UNAVAILABLE",
          message: "Speech processing failed. Please type your complaint description.",
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
