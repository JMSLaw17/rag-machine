import { NextRequest, NextResponse } from 'next/server';
import { CreateIndexOptions } from '@pinecone-database/pinecone';
import fs from 'fs/promises';
import path from 'path';

import pinecone from '@/lib/pinecone';
import openai from '@/lib/openai';

const OPENAI_MODEL = "text-embedding-3-small";
const PINECONE_INDEX = "newsletters";
const METRIC = "cosine";
const DIMENSIONS = 256;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('txts') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No txt files uploaded' }, { status: 400 });
    }

    const embeddingPromises = files.map((file) => {
      return file.text().then((text) => {
        return openai.embeddings.create({
        model: OPENAI_MODEL,
        input: text,
        dimensions: DIMENSIONS,
      })
      .then((response) => {
        return {
          filename: file.name,
          values: response.data[0].embedding,
          content: text
        };
      });
      });
    });

    const embeddings = await Promise.all(embeddingPromises);

    // Check if the index already exists
    const existingIndexes = await pinecone.listIndexes();
    if (!existingIndexes.indexes?.find(index => index.name === PINECONE_INDEX)) {
      await pinecone.createIndex({
        name: PINECONE_INDEX,
        dimension: DIMENSIONS,
        metric: METRIC,
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      } as CreateIndexOptions);
      console.log(`Index '${PINECONE_INDEX}' created successfully.`);
    } else {
      console.log(`Index '${PINECONE_INDEX}' already exists.`);
    }

    const index = pinecone.Index(PINECONE_INDEX);

    await index.upsert(embeddings.map((embedding) => ({
      id: embedding.filename,
      values: embedding.values,
    })));

    // Write the .txt files to @/lib/db
    for (const embedding of embeddings) {
      const filePath = path.join(process.cwd(), 'src', 'db', embedding.filename);
      await fs.writeFile(filePath, embedding.content);
    }

    return NextResponse.json({ message: 'TXT files uploaded and saved successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error in /api/upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
