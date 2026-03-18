import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mock Database
  let projects = [
    {
      id: "1",
      name: "Sistema de Gestão ERP",
      description: "Software de gestão empresarial para pequenas empresas.",
      gitRepo: "owner/repo-erp", // Exemplo de repositório
      versions: [
        { 
          id: "v1", 
          version: "1.2.0", 
          type: "Estável", 
          date: "2026-01-10", 
          changelog: "Configuração inicial e módulos principais.", 
          status: "Lançado",
          feedbacks: [
            { id: "f1", type: "Sugestão", content: "Poderia ter um modo escuro.", status: "Resolvido" }
          ]
        },
        { 
          id: "v2", 
          version: "1.3.0", 
          type: "Beta", 
          date: "2026-02-15", 
          changelog: "Adicionado gerenciamento de inventário e relatórios.", 
          status: "Lançado",
          feedbacks: [
            { id: "f2", type: "Erro", content: "Erro ao gerar PDF de relatório mensal.", status: "Em Progresso" },
            { id: "f3", type: "Sugestão", content: "Melhorar a velocidade de busca.", status: "Aberto" }
          ]
        }
      ]
    }
  ];

  // API Routes
  app.get("/api/projects", (req, res) => {
    res.json(projects);
  });

  // Sincronizar com GitHub
  app.post("/api/projects/:id/sync-git", async (req, res) => {
    const project = projects.find(p => p.id === req.params.id);
    if (!project) return res.status(404).send("Projeto não encontrado");
    if (!project.gitRepo) return res.status(400).send("Repositório Git não configurado para este projeto");

    try {
      // Em um cenário real, usaríamos o GITHUB_TOKEN do ambiente
      // const token = process.env.GITHUB_TOKEN;
      // const response = await fetch(`https://api.github.com/repos/${project.gitRepo}/commits`, {
      //   headers: token ? { 'Authorization': `token ${token}` } : {}
      // });
      
      // Simulação de busca de commits reais para demonstração
      const mockCommits = [
        { sha: "abc123", message: "fix: corrigido erro no gerador de PDF", author: "dev_joao" },
        { sha: "def456", message: "feat: adicionado novo filtro de busca", author: "dev_maria" },
        { sha: "ghi789", message: "docs: atualizada documentação da API", author: "dev_joao" }
      ];

      // Transformar commits em uma sugestão de changelog
      const newChangelog = mockCommits.map(c => `- ${c.message} (por ${c.author})`).join("\n");
      
      res.json({ 
        commits: mockCommits,
        suggestedChangelog: newChangelog,
        repo: project.gitRepo
      });
    } catch (error) {
      res.status(500).send("Erro ao sincronizar com Git");
    }
  });

  app.post("/api/projects", (req, res) => {
    const newProject = {
      id: Math.random().toString(36).substr(2, 9),
      name: req.body.name,
      description: req.body.description,
      gitRepo: req.body.gitRepo || "",
      versions: []
    };
    projects.push(newProject);
    res.status(201).json(newProject);
  });

  app.post("/api/projects/:id/versions", (req, res) => {
    const project = projects.find(p => p.id === req.params.id);
    if (!project) return res.status(404).send("Projeto não encontrado");

    const newVersion = {
      id: Math.random().toString(36).substr(2, 9),
      version: req.body.version,
      type: req.body.type, // "Beta" ou "Estável"
      date: new Date().toISOString().split('T')[0],
      changelog: req.body.changelog,
      status: "Lançado",
      feedbacks: []
    };
    project.versions.push(newVersion);
    res.status(201).json(newVersion);
  });

  // Promover Beta para Estável
  app.patch("/api/projects/:projectId/versions/:versionId/promote", (req, res) => {
    const project = projects.find(p => p.id === req.params.projectId);
    if (!project) return res.status(404).send("Projeto não encontrado");

    const version = project.versions.find(v => v.id === req.params.versionId);
    if (!version) return res.status(404).send("Versão não encontrada");

    version.type = "Estável";
    res.json(version);
  });

  // Adicionar Feedback
  app.post("/api/projects/:projectId/versions/:versionId/feedbacks", (req, res) => {
    const project = projects.find(p => p.id === req.params.projectId);
    if (!project) return res.status(404).send("Projeto não encontrado");

    const version = project.versions.find(v => v.id === req.params.versionId);
    if (!version) return res.status(404).send("Versão não encontrada");

    const newFeedback = {
      id: Math.random().toString(36).substr(2, 9),
      type: req.body.type, // "Erro" ou "Sugestão"
      content: req.body.content,
      status: "Aberto"
    };
    version.feedbacks.push(newFeedback);
    res.status(201).json(newFeedback);
  });

  // Atualizar Status do Feedback
  app.patch("/api/projects/:projectId/versions/:versionId/feedbacks/:feedbackId", (req, res) => {
    const project = projects.find(p => p.id === req.params.projectId);
    if (!project) return res.status(404).send("Projeto não encontrado");

    const version = project.versions.find(v => v.id === req.params.versionId);
    if (!version) return res.status(404).send("Versão não encontrada");

    const feedback = version.feedbacks.find(f => f.id === req.params.feedbackId);
    if (!feedback) return res.status(404).send("Feedback não encontrado");

    feedback.status = req.body.status; // "Aberto", "Em Progresso", "Resolvido"
    res.json(feedback);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
