import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { repo } = await req.json();

    if (!repo) {
      return Response.json({ error: "Parâmetro 'repo' é obrigatório (ex: owner/repo)" }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("github");

    const response = await fetch(`https://api.github.com/repos/${repo}/issues?state=open&per_page=100`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return Response.json({ error: err.message || "Erro ao buscar issues" }, { status: response.status });
    }

    const issues = await response.json();

    // Filtra apenas issues reais (exclui pull requests)
    const onlyIssues = issues.filter(i => !i.pull_request);

    return Response.json({ issues: onlyIssues });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});