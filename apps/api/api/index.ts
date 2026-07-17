import type { IncomingMessage, ServerResponse } from 'http';

import { createApp } from '../src/create-app';

/**
 * Vercel Node.js serverless entry point. Vercel routes every request here
 * (see ../vercel.json's rewrites) and reuses this module across invocations
 * on a warm instance, so the Nest app — and its Express instance — is built
 * once and cached rather than rebuilt per request.
 */
let handlerPromise: Promise<(req: IncomingMessage, res: ServerResponse) => void> | undefined;

async function getHandler(): Promise<(req: IncomingMessage, res: ServerResponse) => void> {
  const app = await createApp();
  await app.init();
  return app.getHttpAdapter().getInstance() as (req: IncomingMessage, res: ServerResponse) => void;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  handlerPromise ??= getHandler();
  const expressHandler = await handlerPromise;
  expressHandler(req, res);
}
