import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return Response.json({
      url: Deno.env.get("EVOLUTION_API_URL"),
      apiKey: Deno.env.get("EVOLUTION_API_KEY"),
      instance: Deno.env.get("EVOLUTION_INSTANCE"),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});