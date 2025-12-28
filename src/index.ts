import { serve } from 'bun';
import index from './index.html';
import { checkRegistrars } from './registrar-check';

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    '/*': index,

    '/api/registrar-check': {
      async GET(req) {
        const url = new URL(req.url);
        const tld = url.searchParams.get('tld')?.toLowerCase();

        if (!tld || tld.length > 100) {
          return Response.json({ error: 'Invalid TLD' }, { status: 400 });
        }

        try {
          const results = await checkRegistrars(tld);
          return Response.json(results);
        } catch (error: any) {
          return Response.json(
            { error: error.message || 'An error occurred' },
            { status: 500 }
          );
        }
      },
    },
  },

  development: process.env.NODE_ENV !== 'production' && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
