import { VertexAI } from '@google-cloud/vertexai';

export function getVertexClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Vertex AI must run server-side');
  }

  return new VertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT_ID!,
    location: process.env.GOOGLE_CLOUD_REGION || 'us-central1'
  });
}
