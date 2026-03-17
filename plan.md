# RAG System Build Plan

This document outlines the step-by-step implementation of a RAG (Retrieval-Augmented Generation) pipeline on top of the existing NestJS + Next.js + PostgreSQL scaffold.

## Overview

- **Frontend**: Next.js 15 / React 19 (port 3000)
- **Backend**: NestJS (port 5000)
- **Database**: PostgreSQL with pgvector extension
- **Cache**: Redis
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **LLM**: Anthropic Claude 3.5 Sonnet
- **Document Corpus**: ~50 markdown files

---

## Phase 0: Infrastructure Prep

### Step 0.1: Update Docker Compose for pgvector

**File:** `docker-compose.yml`

Change PostgreSQL image from `postgres:15-alpine` to `pgvector/pgvector:pg16`:

```yaml
postgres:
  image: pgvector/pgvector:pg16
  restart: always
  environment:
    POSTGRES_USER: changeuser
    POSTGRES_PASSWORD: changepass
    POSTGRES_DB: change_dbname
  ports:
    - '5432:5432'
  volumes:
    - postgres_data:/var/lib/postgresql/data
```

### Step 0.2: Environment Variables

**File:** `.env` (create/update)

```bash
# =====================
# RAG Configuration
# =====================

# Embeddings (OpenAI - most mature LangChain integration)
OPENAI_API_KEY=sk-...

# LLM Configuration (for RAG chain)
ANTHROPIC_API_KEY=sk-ant-...

# Embedding Configuration
EMBEDDING_PROVIDER=openai          # Configurable: openai, anthropic, cohere, etc.
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536

# LLM Configuration
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-sonnet-20241022

# Document Storage
NOTES_DIR=/path/to/your/markdown/files  # Absolute path inside container

# Vector Store
VECTOR_TABLE_NAME=document_chunk
VECTOR_DISTANCE_STRATEGY=cosine  # cosine, euclidean, innerProduct
```

Update `docker-compose.yml` environment section for the server:

```yaml
server:
  # ... existing config
  environment:
    # ... existing vars
    # RAG Configuration
    OPENAI_API_KEY: ${OPENAI_API_KEY}
    ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    EMBEDDING_PROVIDER: ${EMBEDDING_PROVIDER:-openai}
    EMBEDDING_MODEL: ${EMBEDDING_MODEL:-text-embedding-3-small}
    EMBEDDING_DIMENSION: ${EMBEDDING_DIMENSION:-1536}
    LLM_PROVIDER: ${LLM_PROVIDER:-anthropic}
    LLM_MODEL: ${LLM_MODEL:-claude-3-5-sonnet-20241022}
    NOTES_DIR: ${NOTES_DIR:-/app/notes}
    VECTOR_TABLE_NAME: ${VECTOR_TABLE_NAME:-document_chunk}
    VECTOR_DISTANCE_STRATEGY: ${VECTOR_DISTANCE_STRATEGY:-cosine}
```

---

## Phase 1: Database Setup

### Step 1.1: Add Config Getters

**File:** `server/src/config/config.service.ts`

Add these getters to `AppConfigService`:

```typescript
get embeddingConfig() {
  return {
    provider: this.get<string>('EMBEDDING_PROVIDER', 'openai'),
    model: this.get<string>('EMBEDDING_MODEL', 'text-embedding-3-small'),
    dimension: this.get<number>('EMBEDDING_DIMENSION', 1536),
    apiKey: this.get<string>('OPENAI_API_KEY'),
  };
}

get llmConfig() {
  return {
    provider: this.get<string>('LLM_PROVIDER', 'anthropic'),
    model: this.get<string>('LLM_MODEL', 'claude-3-5-sonnet-20241022'),
    apiKey: this.get<string>('ANTHROPIC_API_KEY'),
  };
}

get notesDir() {
  return this.get<string>('NOTES_DIR');
}

get vectorConfig() {
  return {
    tableName: this.get<string>('VECTOR_TABLE_NAME', 'document_chunk'),
    distanceStrategy: this.get<string>('VECTOR_DISTANCE_STRATEGY', 'cosine'),
  };
}
```

### Step 1.2: Create Migration for pgvector + DocumentChunk Table

**File:** `server/src/migrations/1700000000000-CreateDocumentChunkTable.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocumentChunkTable1700000000000 implements MigrationInterface {
  name = 'CreateDocumentChunkTable1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pgvector extension (idempotent - safe to run multiple times)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "vector"`);

    // Create document_chunk table
    await queryRunner.query(`
      CREATE TABLE "document_chunk" (
        "id" SERIAL PRIMARY KEY,
        "source_file" VARCHAR(512) NOT NULL,
        "chunk_index" INTEGER NOT NULL,
        "content" TEXT NOT NULL,
        "embedding" vector(1536),
        "content_hash" VARCHAR(64) NOT NULL,
        "metadata" JSONB DEFAULT '{}',
        "indexed_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create index on source_file for efficient lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_document_chunk_source_file" 
      ON "document_chunk" ("source_file")
    `);

    // Create HNSW index for fast similarity search
    await queryRunner.query(`
      CREATE INDEX "IDX_document_chunk_embedding" 
      ON "document_chunk" USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
    `);

    // Composite index for hash-based deduplication
    await queryRunner.query(`
      CREATE INDEX "IDX_document_chunk_hash" 
      ON "document_chunk" ("source_file", "content_hash")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "document_chunk"`);
  }
}
```

### Step 1.3: Create TypeORM Entity

**File:** `server/src/rag/entity/document-chunk.entity.ts`

```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('document_chunk')
@Index(['sourceFile', 'contentHash'])
export class DocumentChunk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'source_file', length: 512 })
  sourceFile: string;

  @Column({ name: 'chunk_index' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'vector',
    length: 1536,
    name: 'embedding',
    nullable: true,
  })
  embedding: number[];

  @Column({ name: 'content_hash', length: 64 })
  contentHash: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'indexed_at' })
  indexedAt: Date;
}
```

---

## Phase 2: Bun Scripts

### Step 2.1: Install Dependencies

```bash
cd scripts
bun install
```

### Step 2.2: Create Bun Configuration

**File:** `scripts/bunfig.toml`

```toml
[install]
peer = false

[run]
shell = "bun"
```

### Step 2.3: Create Discover Notes Script

**File:** `scripts/discover-notes.ts`

```typescript
import { Glob } from 'bun';
import { resolve } from 'path';

const NOTES_DIR = process.env.NOTES_DIR || './notes';

const glob = new Glob('**/*.md');
const notesPath = resolve(NOTES_DIR);

const files: string[] = [];

for await (const file of glob.scan(notesPath)) {
  files.push(resolve(notesPath, file));
}

console.log(JSON.stringify({ files, count: files.length }, null, 2));
```

### Step 2.4: Create Trigger Index Script

**File:** `scripts/trigger-index.ts`

```typescript
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';

const response = await fetch(`${SERVER_URL}/rag/index`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
});

const result = await response.json();
console.log(JSON.stringify(result, null, 2));

if (!response.ok) {
  process.exit(1);
}
```

### Step 2.5: Add Scripts to package.json

Add to `scripts/package.json`:

```json
{
  "scripts": {
    "discover": "bun run discover-notes.ts",
    "trigger-index": "bun run trigger-index.ts"
  }
}
```

---

## Phase 3: RAG Module Implementation

### Step 3.1: Install LangChain Dependencies

In `server/package.json`, add:

```bash
npm install @langchain/core @langchain/community @langchain/anthropic @langchain/openai
```

### Step 3.2: Create RAG Module

**File:** `server/src/rag/rag.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentChunk } from './entity/document-chunk.entity';
import { IngestionService } from './ingestion.service';
import { RetrieverService } from './retriever.service';
import { ChainService } from './chain.service';
import { RagController } from './rag.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentChunk])],
  providers: [IngestionService, RetrieverService, ChainService],
  controllers: [RagController],
  exports: [IngestionService, RetrieverService],
})
export class RagModule {}
```

### Step 3.3: Create Ingestion Service

**File:** `server/src/rag/ingestion.service.ts`

Key responsibilities:

- File discovery and reading
- Two-pass chunking (MarkdownHeaderTextSplitter → RecursiveCharacterTextSplitter)
- SHA-256 hash computation for diffing
- Embedding generation
- PGVectorStore upsert

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { Document } from '@langchain/core/documents';
import { MarkdownHeaderTextSplitter } from '@langchain/textsplitters';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Embeddings } from '@langchain/core/embeddings';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { DocumentChunk } from './entity/document-chunk.entity';
import { AppConfigService } from '../config/config.service';

interface IndexResult {
  filesProcessed: number;
  chunksIndexed: number;
  chunksSkipped: number;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private readonly headerSplitter = new MarkdownHeaderTextSplitter();
  private readonly chunkSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 100,
  });

  constructor(
    @InjectRepository(DocumentChunk)
    private readonly chunkRepository: Repository<DocumentChunk>,
    private readonly config: AppConfigService,
  ) {}

  async indexDirectory(
    notesDir: string,
    embeddings: Embeddings,
  ): Promise<IndexResult> {
    const result: IndexResult = {
      filesProcessed: 0,
      chunksIndexed: 0,
      chunksSkipped: 0,
    };

    const files = this.discoverMarkdownFiles(notesDir);
    this.logger.log(`Found ${files.length} markdown files`);

    const vectorStore = await this.createVectorStore(embeddings);

    for (const filePath of files) {
      const fileResult = await this.processFile(filePath, vectorStore);
      result.filesProcessed++;
      result.chunksIndexed += fileResult.indexed;
      result.chunksSkipped += fileResult.skipped;
    }

    return result;
  }

  private discoverMarkdownFiles(dir: string): string[] {
    const files: string[] = [];

    const items = readdirSync(dir);
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.discoverMarkdownFiles(fullPath));
      } else if (item.endsWith('.md')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private async processFile(
    filePath: string,
    vectorStore: PGVectorStore,
  ): Promise<{ indexed: number; skipped: number }> {
    const content = readFileSync(filePath, 'utf-8');
    const fileName = basename(filePath);

    // First pass: split by markdown headers
    const headerChunks = await this.headerSplitter.splitText(content);

    const docs: Document[] = [];
    let chunkIndex = 0;

    for (const chunk of headerChunks) {
      // Second pass: safety net with size limit
      const subChunks = await this.chunkSplitter.splitText(chunk.pageContent);

      for (const subContent of subChunks) {
        const hash = this.computeHash(subContent);
        const existingChunk = await this.chunkRepository.findOne({
          where: { sourceFile: fileName, contentHash: hash },
        });

        if (existingChunk) {
          continue; // Skip unchanged chunks
        }

        docs.push(
          new Document({
            pageContent: subContent,
            metadata: {
              sourceFile: fileName,
              chunkIndex,
            },
          }),
        );
        chunkIndex++;
      }
    }

    if (docs.length > 0) {
      await vectorStore.addDocuments(docs);

      // Update TypeORM with chunk metadata
      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const hash = this.computeHash(doc.pageContent);
        const chunk = this.chunkRepository.create({
          sourceFile: doc.metadata.sourceFile as string,
          chunkIndex: doc.metadata.chunkIndex as number,
          content: doc.pageContent,
          contentHash: hash,
          metadata: { chunkIndex: doc.metadata.chunkIndex },
          indexedAt: new Date(),
        });
        await this.chunkRepository.save(chunk);
      }
    }

    return { indexed: docs.length, skipped: chunkIndex - docs.length };
  }

  private computeHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  async createVectorStore(embeddings: Embeddings): Promise<PGVectorStore> {
    const { Pool } = await import('pg');
    const pool = new Pool({
      host: this.config.database.host,
      port: this.config.database.port,
      user: this.config.database.username,
      password: this.config.database.password,
      database: this.config.database.database,
    });

    return PGVectorStore.initialize(embeddings, {
      pool,
      tableName: this.config.vectorConfig.tableName,
      columns: {
        vectorColumnName: 'embedding',
        contentColumnName: 'content',
        metadataColumnName: 'metadata',
      },
      distanceStrategy: this.config.vectorConfig.distanceStrategy as 'cosine',
    });
  }
}
```

### Step 3.4: Create Retriever Service

**File:** `server/src/rag/retriever.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { Embeddings } from '@langchain/core/embeddings';
import { AppConfigService } from '../config/config.service';

export interface RetrievedChunk {
  content: string;
  metadata: Record<string, unknown>;
  score: number;
}

@Injectable()
export class RetrieverService {
  private readonly logger = new Logger(RetrieverService.name);

  constructor(private readonly config: AppConfigService) {}

  async similaritySearch(
    query: string,
    k: number,
    embeddings: Embeddings,
  ): Promise<RetrievedChunk[]> {
    const vectorStore = await this.getVectorStore(embeddings);
    const results = await vectorStore.similaritySearchWithScore(query, k);

    return results.map(([doc, score]) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
      score,
    }));
  }

  private async getVectorStore(embeddings: Embeddings): Promise<PGVectorStore> {
    const { Pool } = await import('pg');
    const pool = new Pool({
      host: this.config.database.host,
      port: this.config.database.port,
      user: this.config.database.username,
      password: this.config.database.password,
      database: this.config.database.database,
    });

    return new PGVectorStore(embeddings, {
      pool,
      tableName: this.config.vectorConfig.tableName,
      columns: {
        vectorColumnName: 'embedding',
        contentColumnName: 'content',
        metadataColumnName: 'metadata',
      },
      distanceStrategy: this.config.vectorConfig.distanceStrategy as 'cosine',
    });
  }
}
```

### Step 3.5: Create Chain Service

**File:** `server/src/rag/chain.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ChatAnthropic } from '@langchain/anthropic';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { PromptTemplate } from '@langchain/core/prompts';
import { RetrieverService, RetrievedChunk } from './retriever.service';
import { AppConfigService } from '../config/config.service';
import { OpenAIEmbeddings } from '@langchain/openai';

export interface ChatResponse {
  answer: string;
  sources: {
    content: string;
    source: string;
    chunkIndex: number;
  }[];
}

const RAG_PROMPT = `You are a helpful AI assistant. Use the following context to answer the user's question.

Context:
{context}

Question: {input}

Provide a clear, accurate answer with citations from the context when possible.`;

@Injectable()
export class ChainService {
  private readonly logger = new Logger(ChainService.name);

  constructor(
    private readonly retrieverService: RetrieverService,
    private readonly config: AppConfigService,
  ) {}

  async chat(query: string, k: number = 4): Promise<ChatResponse> {
    const embeddings = await this.getEmbeddings();
    const retrievedChunks = await this.retrieverService.similaritySearch(
      query,
      k,
      embeddings,
    );

    const llm = new ChatAnthropic({
      model: this.config.llmConfig.model,
      apiKey: this.config.llmConfig.apiKey,
      temperature: 0,
    });

    const prompt = PromptTemplate.fromTemplate(RAG_PROMPT);

    const combineDocsChain = await createStuffDocumentsChain({
      llm,
      prompt,
    });

    const docs = retrievedChunks.map(
      (chunk) =>
        new (await import('@langchain/core/documents')).Document({
          pageContent: chunk.content,
          metadata: chunk.metadata,
        }),
    );

    const result = await combineDocsChain.invoke({
      input: query,
      context: docs,
    });

    return {
      answer: result,
      sources: retrievedChunks.map((chunk) => ({
        content: chunk.content,
        source: chunk.metadata.sourceFile as string,
        chunkIndex: chunk.metadata.chunkIndex as number,
      })),
    };
  }

  private async getEmbeddings() {
    const { provider, model, apiKey, dimension } = this.config.embeddingConfig;

    switch (provider) {
      case 'openai':
        return new OpenAIEmbeddings({ model, dimensions: dimension });
      default:
        throw new Error(`Unsupported embedding provider: ${provider}`);
    }
  }
}
```

### Step 3.6: Create RAG Controller

**File:** `server/src/rag/rag.controller.ts`

```typescript
import { Controller, Post, Get, Body } from '@nestjs/common';
import { ChainService, ChatResponse } from './chain.service';
import { IngestionService } from './ingestion.service';
import { AppConfigService } from '../config/config.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentChunk } from './entity/document-chunk.entity';

class ChatDto {
  question: string;
  k?: number;
}

@Controller('rag')
export class RagController {
  constructor(
    private readonly chainService: ChainService,
    private readonly ingestionService: IngestionService,
    private readonly config: AppConfigService,
    @InjectRepository(DocumentChunk)
    private readonly chunkRepository: Repository<DocumentChunk>,
  ) {}

  @Post('chat')
  async chat(@Body() dto: ChatDto): Promise<ChatResponse> {
    return this.chainService.chat(dto.question, dto.k ?? 4);
  }

  @Post('index')
  async triggerIndex(): Promise<{
    status: string;
    message: string;
    stats?: any;
  }> {
    const notesDir = this.config.notesDir;
    if (!notesDir) {
      throw new Error('NOTES_DIR not configured');
    }

    const embeddings = await this.getEmbeddings();
    const stats = await this.ingestionService.indexDirectory(
      notesDir,
      embeddings,
    );

    return {
      status: 'success',
      message: 'Indexing completed',
      stats,
    };
  }

  @Get('documents')
  async listDocuments(): Promise<{
    files: { sourceFile: string; chunkCount: number; lastIndexed: Date }[];
  }> {
    const results = await this.chunkRepository
      .createQueryBuilder('chunk')
      .select('chunk.source_file', 'sourceFile')
      .addSelect('COUNT(*)', 'chunkCount')
      .addSelect('MAX(chunk.indexed_at)', 'lastIndexed')
      .groupBy('chunk.source_file')
      .getRawMany();

    return { files: results };
  }

  private async getEmbeddings() {
    const { provider, model, dimension } = this.config.embeddingConfig;

    switch (provider) {
      case 'openai':
        const { OpenAIEmbeddings } = await import('@langchain/openai');
        return new OpenAIEmbeddings({ model, dimensions: dimension });
      default:
        throw new Error(`Unsupported embedding provider: ${provider}`);
    }
  }
}
```

### Step 3.7: Register RAG Module in AppModule

**File:** `server/src/app.module.ts`

Add `RagModule` to imports:

```typescript
import { RagModule } from './rag/rag.module';

@Module({
  imports: [
    // ... existing imports
    RagModule,
  ],
  // ... rest
})
export class AppModule {}
```

---

## Phase 4: Frontend Integration

### Step 4.1: Add API Client Methods

**File:** `client/lib/api-client.ts`

Add these methods to the existing `apiClient` object:

```typescript
export const ragClient = {
  async chat(
    question: string,
    k?: number,
  ): Promise<{
    answer: string;
    sources: { content: string; source: string; chunkIndex: number }[];
  }> {
    const response = await fetch(`${serverUrl}/rag/chat`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, k }),
    });
    if (!response.ok) {
      throw new Error(`Chat failed: ${response.statusText}`);
    }
    return response.json();
  },

  async triggerIndex(): Promise<{
    status: string;
    message: string;
    stats?: any;
  }> {
    const response = await fetch(`${serverUrl}/rag/index`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Indexing failed: ${response.statusText}`);
    }
    return response.json();
  },

  async listDocuments(): Promise<{
    files: { sourceFile: string; chunkCount: number; lastIndexed: Date }[];
  }> {
    const response = await fetch(`${serverUrl}/rag/documents`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to list documents: ${response.statusText}`);
    }
    return response.json();
  },
};
```

### Step 4.2: Create RAG Hook

**File:** `client/hooks/use-rag.ts`

```typescript
import { useMutation, useQuery } from '@tanstack/react-query';
import { ragClient } from '@/lib/api-client';

export function useRagChat() {
  return useMutation({
    mutationFn: ({ question, k }: { question: string; k?: number }) =>
      ragClient.chat(question, k),
  });
}

export function useRagIndex() {
  return useMutation({
    mutationFn: () => ragClient.triggerIndex(),
  });
}

export function useRagDocuments() {
  return useQuery({
    queryKey: ['rag', 'documents'],
    queryFn: () => ragClient.listDocuments(),
    staleTime: 60 * 1000,
  });
}
```

### Step 4.3: Create Chat UI Component (Example)

**File:** `client/components/rag-chat.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRagChat } from '@/hooks/use-rag';

export function RagChat() {
  const [question, setQuestion] = useState('');
  const chatMutation = useRagChat();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    chatMutation.mutate({ question });
    setQuestion('');
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your notes..."
          className="flex-1 px-4 py-2 border rounded-lg"
        />
        <button
          type="submit"
          disabled={chatMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          {chatMutation.isPending ? 'Thinking...' : 'Ask'}
        </button>
      </form>

      {chatMutation.isError && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          {chatMutation.error.message}
        </div>
      )}

      {chatMutation.data && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Answer:</h3>
            <p>{chatMutation.data.answer}</p>
          </div>

          {chatMutation.data.sources.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2">Sources:</h3>
              <ul className="space-y-2">
                {chatMutation.data.sources.map((source, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{source.source}</span>
                    <p className="text-gray-600 line-clamp-2">{source.content}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Integration Gotchas

### TypeORM + pgvector

| Issue                       | Solution                                                                         |
| --------------------------- | -------------------------------------------------------------------------------- |
| `DataTypeNotSupportedError` | Use `type: 'vector'` with `length: 1536` - TypeORM 0.3.x has native support      |
| Migration ordering          | Enable `vector` extension FIRST in migration before creating tables              |
| HNSW index creation         | Create manually via `queryRunner.query()` - TypeORM doesn't support it natively  |
| Synchronize mode            | Disable `synchronize` for production - use migrations only                       |
| Vector serialization        | Arrays auto-serialized in 0.3.x; use `queryRunner.query()` for raw SQL if issues |

### LangChain TS

| Issue               | Solution                                                                         |
| ------------------- | -------------------------------------------------------------------------------- |
| Pool client leak    | Use `new PGVectorStore()` instead of `.initialize()` when passing external pool  |
| Pool destruction    | Only call `.end()` on internally-created pools, never shared ones                |
| Dimensions mismatch | Must pass `dimensions` option to Embeddings class                                |
| Uppercase columns   | Always use lowercase column names in PGVectorStore config                        |
| Async imports       | Use dynamic `import('@langchain/...')` in methods to avoid NestJS startup issues |

---

## Recommended Build Order

1. **Update docker-compose.yml** → pgvector image
2. **Add config getters** → config.service.ts
3. **Create migration + entity** → Phase 1 complete
4. **Install LangChain deps** → npm install in server/
5. **Bun scripts** → discover + trigger-index
6. **RAG Module** → ingestion, retriever, chain services
7. **Controller + register module** → API endpoints ready
8. **Frontend integration** → API client, hooks, chat UI

This order respects dependencies: config → database → services → API.
