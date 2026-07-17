'use strict';

// Plain CommonJS on purpose: this is Vercel's Node.js Function entry point.
// Requiring the already-built dist/create-app.js (from `nest build`, run in
// buildCommand) means esbuild only has to bundle already-typechecked
// JavaScript here, instead of Vercel's Node.js builder re-typechecking the
// whole Nest source tree itself, which resolves types differently than our
// own `nest build`/`tsc` and fails on files that pass locally.
const { createApp } = require('../dist/create-app');

let handlerPromise;

async function getHandler() {
  const app = await createApp();
  await app.init();
  return app.getHttpAdapter().getInstance();
}

module.exports = async function handler(req, res) {
  handlerPromise = handlerPromise || getHandler();
  const expressHandler = await handlerPromise;
  expressHandler(req, res);
};
