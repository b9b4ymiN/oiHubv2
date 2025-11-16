// Deploy this to Cloudflare Workers to bypass geo-restrictions
// Instructions: https://workers.cloudflare.com

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-MBX-APIKEY',
        },
      });
    }

    try {
      const url = new URL(request.url);

      // Forward request to Binance API
      const binanceUrl = `https://fapi.binance.com${url.pathname}${url.search}`;

      const response = await fetch(binanceUrl, {
        method: request.method,
        headers: {
          'X-MBX-APIKEY': request.headers.get('X-MBX-APIKEY') || '',
          'Content-Type': 'application/json',
        },
      });

      // Clone response and add CORS headers
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-MBX-APIKEY');

      return newResponse;
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
