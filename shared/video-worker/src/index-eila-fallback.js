import app from './index.js';

function withEilaLemonSliceFallback(env) {
  if (!env || env.LEMONSLICE_EILA_OVERWATCH_API_KEY || !env.LEMONSLICE_AI_FANS_API_KEY) return env;
  return new Proxy(env, {
    get(target, property, receiver) {
      if (property === 'LEMONSLICE_EILA_OVERWATCH_API_KEY') return target.LEMONSLICE_AI_FANS_API_KEY;
      return Reflect.get(target, property, receiver);
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (
      request.method === 'POST'
      && url.pathname === '/internal/lemonslice/sessions'
      && url.searchParams.get('tenant') === 'eila-overwatch'
    ) {
      return app.fetch(request, withEilaLemonSliceFallback(env), ctx);
    }
    return app.fetch(request, env, ctx);
  },
};
