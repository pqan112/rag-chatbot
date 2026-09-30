"use server";

import { chunkContent } from "@/lib/chunking";
import { db } from "@/lib/db-config";
import { documents } from "@/lib/db-schema";
import { generateEmbeddings } from "@/lib/embeddings";
import { PDFParse } from "pdf-parse";

export async function processPdfFile(formData: FormData) {
  try {
    const file = formData.get("pdf") as File;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const parser = new PDFParse({ data: buffer });
    try {
      const data = await parser.getText();
      if (!data.text || data.text.trim().length === 0) {
        return {
          success: false,
          error: "No text found in Pdf",
        };
      }

      const chunks = await chunkContent(data.text);
      const embeedings = await generateEmbeddings(chunks);

      const records = chunks.map((chunk, index) => ({
        content: chunk,
        embedding: embeedings[index],
      }));

      await db.insert(documents).values(records);
      return {
        success: true,
        message: `Created ${records.length} searchable chunks`,
      };
    } finally {
      await parser.destroy();
    }
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "Failed to porcess PDF",
    };
  }
}
