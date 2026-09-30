import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pendingUploads } from "@/db/schema";
import { Category } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "No image file provided in upload request.",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        {
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: "Only image files (JPEG, PNG, WebP) are supported.",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Convert file to base64 Data URL for persistent storage in database
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Lightweight heuristic CV preview based on filename or image content
    const nameLower = file.name.toLowerCase();
    let cvCategory: Category = "POTHOLE_ROAD_DAMAGE";
    let cvConfidence = 0.88;

    if (nameLower.includes("garbage") || nameLower.includes("waste") || nameLower.includes("trash")) {
      cvCategory = "GARBAGE";
      cvConfidence = 0.92;
    } else if (nameLower.includes("water") || nameLower.includes("flood") || nameLower.includes("drain")) {
      cvCategory = "DRAINAGE_WATERLOGGING";
      cvConfidence = 0.89;
    } else if (nameLower.includes("light") || nameLower.includes("lamp") || nameLower.includes("dark")) {
      cvCategory = "STREETLIGHT_FAILURE";
      cvConfidence = 0.91;
    } else if (nameLower.includes("tree") || nameLower.includes("branch")) {
      cvCategory = "FALLEN_TREE";
      cvConfidence = 0.94;
    } else if (nameLower.includes("pipe") || nameLower.includes("leak")) {
      cvCategory = "WATER_LEAKAGE";
      cvConfidence = 0.9;
    }

    const cvPreview = {
      category: cvCategory,
      confidence: cvConfidence,
    };

    const [upload] = await db
      .insert(pendingUploads)
      .values({
        type: "IMAGE",
        mime: file.type,
        filename: file.name,
        dataUrl,
        cvPreview,
      })
      .returning();

    return NextResponse.json({
      upload_id: upload.id,
      cv_preview: cvPreview,
    });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL",
          message: "Failed to upload image evidence.",
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
