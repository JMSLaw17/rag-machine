import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

import pinecone from '@/lib/pinecone';
import openai from '@/lib/openai';
import { SearchResponse } from '@/types';

const OPENAI_MODEL = "text-embedding-3-small";
const PINECONE_INDEX = "newsletters";
const DIMENSIONS = 256;

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json({ error: 'No query provided' }, { status: 400 });
    }

    // Get embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: OPENAI_MODEL,
      input: query,
      dimensions: DIMENSIONS,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Query Pinecone
    const index = pinecone.Index(PINECONE_INDEX);
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: 1,
      includeMetadata: true,
    });

    if (queryResponse.matches.length === 0) {
      console.log('No matching documents found');
    }

    const matchedDocumentId = queryResponse.matches[0].id;

    // Read the corresponding file from the db folder
    const filePath = path.join(process.cwd(), 'src', 'db', matchedDocumentId);
    const fileContent = await fs.readFile(filePath, 'utf-8');

    // Use OpenAI to generate a response
    const completionResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant. Use the provided context to answer the user's query." },
        { role: "user", content: `Context: ${fileContent}\n\nQuery: ${query}` }
      ],
    });

    const generatedResponse = completionResponse.choices[0].message.content;

    return NextResponse.json({ data: generatedResponse } as SearchResponse, { status: 200 });
  } catch (error) {
    console.error('Error in /api/search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
