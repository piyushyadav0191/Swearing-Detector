import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "hono/adapter";
import { Index } from "@upstash/vector";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const semanticSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 25,
  separators: [" "],
  chunkOverlap: 12,
});

const app = new Hono();

type Environment = {
  VECTOR_URL: string;
  VECTOR_TOKEN: string;
};

app.use(cors());

const WHITELIST = ["swear"];

app.post("/", async (c) => {
  if (c.req.header("Content-Type") !== "application/json") {
    return c.json({ error: "JSON body expected" }, { status: 406 });
  }

  try {
    const { VECTOR_TOKEN, VECTOR_URL } = env<Environment>(c);
    const index = new Index({
      url: VECTOR_URL,
      token: VECTOR_TOKEN,
      cache: false,
    });

    const body = await c.req.json();
    let { message } = body as { message: string };
    if (!message) {
      return c.json({ error: "Message is required" }, { status: 400 });
    }

    if (message.length > 1000) {
      return c.json(
        { error: "Message can only at most 1000 characters" },
        { status: 413 }
      );
    }

    message = message
      .split(/\s/)
      .filter((word) => !WHITELIST.includes(word.toLocaleLowerCase()))
      .join(" ");

    const [semanticChunks, wordChunks] = await Promise.all([
      splitTextIntoSemantic(message),
      splitTextIntoWords(message),
    ]);

    const flaggedFor = new Set<{ score: number; text: string }>();
    const vectorRes = await Promise.all([
      ...wordChunks.map(async (wordChunk) => {
        const [vector] = await index.query({
          topK: 1,
          data: wordChunk,
          includeMetadata: true,
        });
        if (vector && vector.score > 0.95) {
          flaggedFor.add({
            score: vector.score,
            text: vector.metadata!.text as string,
          });
        }
        return { score: 0 };
      }),
      ...semanticChunks.map(async (semanticChunk) => {
        const [vector] = await index.query({
          topK: 1,
          data: semanticChunk,
          includeMetadata: true,
        });
        if (vector && vector.score > 0.88) {
          flaggedFor.add({
            score: vector.score,
            text: vector.metadata!.text as string,
          });
        }
        return vector!;
      }),
    ]);
    if (flaggedFor.size > 0) {
      const sorted = Array.from(flaggedFor).sort((a, b) =>
        a.score > b.score ? -1 : 1
      );
      return c.json({
        isCursedAutoCorrect: true,
        score: sorted[0].score,
        flaggedFor: sorted[0].text,
      });
    } else {
      const mostProfaneChunk = vectorRes.sort((a, b) =>
        a.score > b.score ? -1 : 1
      )[0];
      return c.json({
        isCursedAutoCorrect: false,
        score: mostProfaneChunk.score,
      });
    }
  } catch (error) {
    console.log(error);
    return c.json({ error: "Internal Server Error" }, { status: 500 });
  }
});

function splitTextIntoWords(text: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const words = text.split(/\s/);
    resolve(words);
  });
}

async function splitTextIntoSemantic(text: string) {
  if (text.split(/\s/).length === 1) {
    return [];
  }
  const documents = await semanticSplitter.createDocuments([text]);
  const chunks = documents.map((chunk) => chunk.pageContent);
  return chunks;
}


export default app