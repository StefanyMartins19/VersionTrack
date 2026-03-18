import { useState, useEffect } from "react";
import { Plus, ChevronRight, Package, Activity, CheckCircle2, Clock, Terminal, Layers, Filter, Search, MessageSquare, AlertCircle, ArrowUpCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Feedback {
  id: string;
  type: "Erro" | "Sugestão";
  content: string;
  status: "Aberto" | "Em Progresso" | "Resolvido";
}

interface Version {
  id: string;
  version: string;
  type: "Beta" | "Estável";
  date: string;
  changelog: string;
  status: string;
  feedbacks: Feedback[];
}

interface Project {
  id: string;
  name: string;
  description: string;
  gitRepo: string;
  versions: Version[];
}

type FilterType = "Todos" | "Beta" | "Estável";

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState<{ projectId: string, versionId: string } | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  
  // Form States
  const [newVersion, setNewVersion] = useState({ version: "", type: "Beta" as "Beta" | "Estável", changelog: "" });
  const [newFeedback, setNewFeedback] = useState({ type: "Erro" as "Erro" | "Sugestão", content: "" });
  const [newProject, setNewProject] = useState({ name: "", description: "", gitRepo: "" });

  const fetchData = () => {
    setLoading(true);
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        setProjects(data);
        if (selectedProject) {
          const updated = data.find((p: Project) => p.id === selectedProject.id);
          if (updated) setSelectedProject(updated);
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddProject = async () => {
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProject),
    });
    setShowProjectModal(false);
    setNewProject({ name: "", description: "", gitRepo: "" });
    fetchData();
  };

  const handleSyncGit = async () => {
    if (!selectedProject) return;
    setSyncing(true);
    try {
      const response = await fetch(`/api/projects/${selectedProject.id}/sync-git`, { method: "POST" });
      const data = await response.json();
      setNewVersion({ ...newVersion, changelog: data.suggestedChangelog });
      setShowVersionModal(true);
    } catch (error) {
      console.error("Erro ao sincronizar Git");
    } finally {
      setSyncing(false);
    }
  };

  const handleAddVersion = async () => {
    if (!selectedProject) return;
    await fetch(`/api/projects/${selectedProject.id}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newVersion),
    });
    setShowVersionModal(false);
    setNewVersion({ version: "", type: "Beta", changelog: "" });
    fetchData();
  };

  const handleAddFeedback = async () => {
    if (!showFeedbackModal) return;
    await fetch(`/api/projects/${showFeedbackModal.projectId}/versions/${showFeedbackModal.versionId}/feedbacks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newFeedback),
    });
    setShowFeedbackModal(null);
    setNewFeedback({ type: "Erro", content: "" });
    fetchData();
  };

  const handlePromote = async (projectId: string, versionId: string) => {
    await fetch(`/api/projects/${projectId}/versions/${versionId}/promote`, { method: "PATCH" });
    fetchData();
  };

  const handleUpdateFeedbackStatus = async (projectId: string, versionId: string, feedbackId: string, status: string) => {
    await fetch(`/api/projects/${projectId}/versions/${versionId}/feedbacks/${feedbackId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  };

  const getStatusIcon = (status: string) => {
    if (status.includes("Lançado")) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status.includes("Progresso")) return <Clock className="w-4 h-4 text-amber-500" />;
    return <Activity className="w-4 h-4 text-slate-400" />;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Beta": return "bg-amber-50 text-amber-600 border-amber-200";
      case "Estável": return "bg-blue-50 text-blue-600 border-blue-200";
      default: return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const getFeedbackStatusColor = (status: string) => {
    switch (status) {
      case "Aberto": return "text-red-500 bg-red-50";
      case "Em Progresso": return "text-amber-500 bg-amber-50";
      case "Resolvido": return "text-emerald-500 bg-emerald-50";
      default: return "text-slate-500 bg-slate-50";
    }
  };

  const filteredVersions = selectedProject
    ? selectedProject.versions
        .filter(v => filter === "Todos" || v.type === filter)
        .filter(v => 
          v.version.toLowerCase().includes(searchTerm.toLowerCase()) || 
          v.changelog.toLowerCase().includes(searchTerm.toLowerCase())
        )
    : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 flex items-center justify-center rounded-xl shadow-lg shadow-blue-200">
            <Layers className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">VersionTrack</h1>
            <p className="text-xs font-medium text-blue-600 uppercase tracking-widest">Gestão de Ciclo de Vida de Software</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowProjectModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Projeto</span>
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-[380px_1fr] h-[calc(100vh-81px)]">
        {/* Sidebar - Project List */}
        <aside className="bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Package className="w-3 h-3" />
              Projetos Ativos
            </h2>
          </div>
          {loading && projects.length === 0 ? (
            <div className="p-12 text-center text-slate-400 animate-pulse">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              Carregando projetos...
            </div>
          ) : (
            projects.map((project) => (
              <button
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className={`w-full text-left p-6 border-b border-slate-100 transition-all group relative ${
                  selectedProject?.id === project.id 
                    ? "bg-blue-50/50" 
                    : "hover:bg-slate-50"
                }`}
              >
                {selectedProject?.id === project.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
                )}
                <div className="flex justify-between items-start mb-2">
                  <h3 className={`font-bold text-lg leading-tight transition-colors ${selectedProject?.id === project.id ? "text-blue-700" : "text-slate-800"}`}>
                    {project.name}
                  </h3>
                  <ChevronRight className={`w-5 h-5 transition-all ${selectedProject?.id === project.id ? "text-blue-600 translate-x-1" : "text-slate-300 group-hover:translate-x-1"}`} />
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">{project.description}</p>
                <div className="flex gap-2">
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200 uppercase">
                    {project.versions.length} Versões
                  </span>
                </div>
              </button>
            ))
          )}
        </aside>

        {/* Main Content - Version Details */}
        <section className="bg-slate-50 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {selectedProject ? (
              <motion.div
                key={selectedProject.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="max-w-5xl mx-auto"
              >
                {/* Project Header */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-8 flex justify-between items-start">
                  <div>
                    <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">{selectedProject.name}</h2>
                    <p className="text-lg text-slate-500 max-w-3xl leading-relaxed mb-4">{selectedProject.description}</p>
                    {selectedProject.gitRepo && (
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-fit">
                        <Terminal className="w-3.5 h-3.5" />
                        github.com/{selectedProject.gitRepo}
                      </div>
                    )}
                  </div>
                  {selectedProject.gitRepo && (
                    <button 
                      onClick={handleSyncGit}
                      disabled={syncing}
                      className={`flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 ${syncing ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <Activity className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                      <span>{syncing ? "Sincronizando..." : "Sincronizar Git"}</span>
                    </button>
                  )}
                </div>

                {/* Filters and Search */}
                <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
                  <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    {(["Todos", "Beta", "Estável"] as FilterType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setFilter(t)}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                          filter === t 
                            ? "bg-blue-600 text-white shadow-md shadow-blue-100" 
                            : "text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Filtrar por versão..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                      />
                    </div>
                    <button 
                      onClick={() => setShowVersionModal(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                    >
                      <Plus className="w-4 h-4 text-blue-600" />
                      <span>Nova Versão</span>
                    </button>
                  </div>
                </div>

                {/* Version List */}
                <div className="space-y-6">
                  {filteredVersions.length === 0 ? (
                    <div className="bg-white rounded-2xl p-20 text-center border border-slate-200 shadow-sm">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Filter className="w-8 h-8 text-slate-200" />
                      </div>
                      <p className="text-slate-400 font-medium">Nenhuma versão encontrada.</p>
                    </div>
                  ) : (
                    [...filteredVersions].reverse().map((version) => (
                      <div key={version.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-8 border-b border-slate-100">
                          <div className="flex flex-col md:flex-row md:items-center gap-6">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-extrabold text-3xl text-slate-900 tracking-tight">{version.version}</span>
                                <span className={`text-[10px] font-bold px-2.5 py-1 border rounded-md uppercase tracking-wider ${getTypeColor(version.type)}`}>
                                  {version.type}
                                </span>
                                {version.type === "Beta" && (
                                  <button 
                                    onClick={() => handlePromote(selectedProject.id, version.id)}
                                    className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider bg-blue-50 px-2 py-1 rounded-md border border-blue-100"
                                  >
                                    <ArrowUpCircle className="w-3 h-3" />
                                    Promover para Estável
                                  </button>
                                )}
                              </div>
                              <p className="text-slate-500 leading-relaxed mb-4">{version.changelog}</p>
                              <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  Lançada em {version.date.split('-').reverse().join('/')}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  {getStatusIcon(version.status)}
                                  {version.status}
                                </span>
                              </div>
                            </div>
                            <div className="md:w-48 flex justify-end">
                              <button 
                                onClick={() => setShowFeedbackModal({ projectId: selectedProject.id, versionId: version.id })}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-all"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Registrar Feedback
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Feedbacks Section */}
                        <div className="bg-slate-50/50 p-6">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <AlertCircle className="w-3 h-3" />
                            Feedbacks da Versão ({version.feedbacks.length})
                          </h4>
                          <div className="space-y-3">
                            {version.feedbacks.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">Nenhum feedback registrado ainda.</p>
                            ) : (
                              version.feedbacks.map((fb) => (
                                <div key={fb.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between gap-4">
                                  <div className="flex gap-3">
                                    <div className={`mt-1 w-2 h-2 rounded-full ${fb.type === "Erro" ? "bg-red-500" : "bg-blue-500"}`} />
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${fb.type === "Erro" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
                                          {fb.type}
                                        </span>
                                        <span className="text-xs font-medium text-slate-700">{fb.content}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <select 
                                    value={fb.status}
                                    onChange={(e) => handleUpdateFeedbackStatus(selectedProject.id, version.id, fb.id, e.target.value)}
                                    className={`text-[10px] font-bold px-2 py-1 rounded-md border-none outline-none cursor-pointer ${getFeedbackStatusColor(fb.status)}`}
                                  >
                                    <option value="Aberto">Aberto</option>
                                    <option value="Em Progresso">Em Progresso</option>
                                    <option value="Resolvido">Resolvido</option>
                                  </select>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                <div className="w-32 h-32 bg-white rounded-3xl shadow-xl shadow-blue-100 flex items-center justify-center mb-8 border border-slate-100">
                  <Package className="w-16 h-16 text-blue-100 stroke-[1.5px]" />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-4">Bem-vindo ao VersionTrack</h2>
                <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                  Selecione um projeto na barra lateral para gerenciar suas versões e feedbacks.
                </p>
              </div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Novo Projeto</h3>
              <button onClick={() => setShowProjectModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome do Projeto</label>
                <input 
                  type="text" 
                  placeholder="Ex: Sistema de Gestão ERP" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descrição</label>
                <textarea 
                  rows={2}
                  placeholder="Breve descrição do software..." 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Repositório GitHub (opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ex: usuario/repositorio" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  value={newProject.gitRepo}
                  onChange={(e) => setNewProject({ ...newProject, gitRepo: e.target.value })}
                />
                <p className="text-[10px] text-slate-400 mt-1 italic">Usado para sincronizar commits automaticamente no changelog.</p>
              </div>
              <button 
                onClick={handleAddProject}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                Criar Projeto
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Version Modal */}
      {showVersionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Cadastrar Nova Versão</h3>
              <button onClick={() => setShowVersionModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Número da Versão</label>
                <input 
                  type="text" 
                  placeholder="Ex: 1.3.0" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  value={newVersion.version}
                  onChange={(e) => setNewVersion({ ...newVersion, version: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tipo</label>
                <div className="flex gap-2">
                  {["Beta", "Estável"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setNewVersion({ ...newVersion, type: t as any })}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${newVersion.type === t ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descrição das Mudanças</label>
                <textarea 
                  rows={3}
                  placeholder="O que mudou nesta versão?" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  value={newVersion.changelog}
                  onChange={(e) => setNewVersion({ ...newVersion, changelog: e.target.value })}
                />
              </div>
              <button 
                onClick={handleAddVersion}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                Lançar Versão (Release)
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Registrar Feedback</h3>
              <button onClick={() => setShowFeedbackModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tipo de Feedback</label>
                <div className="flex gap-2">
                  {["Erro", "Sugestão"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setNewFeedback({ ...newFeedback, type: t as any })}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${newFeedback.type === t ? (t === "Erro" ? "bg-red-600 text-white border-red-600" : "bg-blue-600 text-white border-blue-600") : "bg-white text-slate-600 border-slate-200"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Conteúdo do Feedback</label>
                <textarea 
                  rows={3}
                  placeholder="Descreva o erro ou a sugestão..." 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  value={newFeedback.content}
                  onChange={(e) => setNewFeedback({ ...newFeedback, content: e.target.value })}
                />
              </div>
              <button 
                onClick={handleAddFeedback}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
              >
                Salvar Feedback
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Footer Status Bar */}
      <footer className="bg-white border-t border-slate-200 px-8 py-3 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <div className="flex gap-8">
          <span className="flex items-center gap-2 text-emerald-600">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-200" />
            Sistema Online
          </span>
          <span className="hidden sm:inline">Versão v1.0.4-estável</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" />
          {new Date().toLocaleTimeString('pt-BR')} BRT
        </div>
      </footer>
    </div>
  );
}
