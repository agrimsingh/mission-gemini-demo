"use node";

import { GoogleGenAI } from "@google/genai";

const EMBEDDING_DIMENSIONS = 1536;

type EmbeddingResponseShape = {
  embedding?: {
    values?: number[];
  };
  embeddings?: Array<{
    values?: number[];
  }>;
};

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY.");
  }

  return new GoogleGenAI({ apiKey });
}

function getEmbeddingValues(response: EmbeddingResponseShape): number[] {
  const values = response.embedding?.values ?? response.embeddings?.[0]?.values;

  if (!values || values.length === 0) {
    throw new Error("Gemini did not return an embedding vector.");
  }

  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected a ${EMBEDDING_DIMENSIONS}-dimensional embedding, received ${values.length}.`,
    );
  }

  return values;
}

function normalizeVector(values: number[]): number[] {
  const magnitude = Math.sqrt(
    values.reduce((sum, value) => sum + value * value, 0),
  );

  if (magnitude === 0) {
    throw new Error("Cannot normalize a zero-magnitude embedding.");
  }

  return values.map((value) => value / magnitude);
}

export async function embedAudioBlob(blob: Blob): Promise<number[]> {
  const client = getGeminiClient();
  const arrayBuffer = await blob.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");

  const response = (await client.models.embedContent({
    model: "gemini-embedding-2-preview",
    contents: [
      {
        inlineData: {
          mimeType: blob.type || "audio/wav",
          data: base64Data,
        },
      },
    ],
    config: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
      taskType: "RETRIEVAL_DOCUMENT",
    },
  })) as EmbeddingResponseShape;

  return normalizeVector(getEmbeddingValues(response));
}

export async function embedTextQuery(prompt: string): Promise<number[]> {
  const client = getGeminiClient();
  const response = (await client.models.embedContent({
    model: "gemini-embedding-2-preview",
    contents: prompt,
    config: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
      taskType: "RETRIEVAL_QUERY",
    },
  })) as EmbeddingResponseShape;

  return normalizeVector(getEmbeddingValues(response));
}
