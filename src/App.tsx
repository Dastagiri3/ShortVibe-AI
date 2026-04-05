import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Video, 
  Sparkles, 
  Type, 
  Image as ImageIcon, 
  Mic, 
  Settings, 
  ArrowRight, 
  Plus, 
  Trash2, 
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Layout,
  Music,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';
import { 
  segmentTextIntoScenes, 
  generateSceneImage, 
  generateSceneAudio, 
  Scene, 
  VideoProject 
} from './services/aiService';
import { VideoPreview } from './components/VideoPreview';

type Step = 'input' | 'processing' | 'editor' | 'preview';

export default function App() {
  const [step, setStep] = useState<Step>('input');
  const [script, setScript] = useState('');
  const [style, setStyle] = useState<'cinematic' | 'illustrated' | 'corporate'>('cinematic');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1' | '16:9'>('9:16');
  const [project, setProject] = useState<VideoProject | null>(null);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleStartGeneration = async () => {
    if (!script.trim()) return;
    
    setStep('processing');
    setError(null);
    try {
      setLoadingStatus('Analyzing script and segmenting scenes...');
      const scenes = await segmentTextIntoScenes(script, style);
      
      const newProject: VideoProject = {
        id: Math.random().toString(36).substr(2, 9),
        title: 'Untitled Video',
        script,
        style,
        aspectRatio,
        scenes
      };
      setProject(newProject);
      setStep('editor');
    } catch (err: any) {
      setError(err.message || 'Failed to process script');
      setStep('input');
    }
  };

  const generateAllAssets = async () => {
    if (!project) return;
    
    setLoadingStatus('Initializing generation pipeline...');
    // Initial delay to avoid immediate rate limits
    await new Promise(resolve => setTimeout(resolve, 1500));

    const updatedScenes = [...project.scenes];
    let hasError = false;
    
    for (let i = 0; i < updatedScenes.length; i++) {
      setLoadingStatus(`Processing scene ${i + 1} of ${updatedScenes.length}...`);
      try {
        if (!updatedScenes[i].imageUrl) {
          updatedScenes[i].imageUrl = await generateSceneImage(updatedScenes[i].imagePrompt, style);
          // Small delay between image and audio generation
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        if (!updatedScenes[i].audioUrl) {
          updatedScenes[i].audioUrl = await generateSceneAudio(updatedScenes[i].text);
        }
        setProject({ ...project, scenes: updatedScenes });
        
        // Delay between scenes to respect rate limits
        if (i < updatedScenes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 4000));
        }
      } catch (err: any) {
        console.error(`Error in scene ${i}:`, err);
        hasError = true;
        setError(`Failed to generate assets for scene ${i + 1} after multiple retries. Please wait a moment and try again.`);
      }
    }
    
    if (!hasError) {
      setStep('preview');
    } else {
      setStep('editor');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="h-16 border-b bg-white flex items-center justify-between px-8 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white">
            <Video size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight">ShortVibe</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
            <Settings size={20} />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500 to-purple-500" />
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8">
        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              <div className="text-center space-y-4">
                <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
                  Turn your words into <span className="gradient-text">viral videos</span>
                </h1>
                <p className="text-xl text-slate-500 max-w-xl mx-auto">
                  Paste your script, blog post, or ideas. Our AI handles the visuals, voiceover, and editing.
                </p>
              </div>

              <div className="glass-panel p-8 rounded-3xl space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Your Script</label>
                  <textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder="Once upon a time in a digital world..."
                    className="w-full h-64 p-6 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-brand-500 focus:ring-0 transition-all resize-none text-lg"
                  />
                  <div className="flex justify-between text-xs text-slate-400 font-medium">
                    <span>{script.length} / 5,000 characters</span>
                    <span>Supports Markdown</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Visual Style</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['cinematic', 'illustrated', 'corporate'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setStyle(s)}
                          className={`py-3 px-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                            style === s 
                            ? 'bg-brand-600 text-white shadow-lg shadow-brand-200' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Aspect Ratio</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['9:16', '1:1', '16:9'] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setAspectRatio(r)}
                          className={`py-3 px-2 rounded-xl text-sm font-semibold transition-all ${
                            aspectRatio === r 
                            ? 'bg-brand-600 text-white shadow-lg shadow-brand-200' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStartGeneration}
                  disabled={!script.trim()}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold text-xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <Sparkles size={24} className="text-brand-400 group-hover:rotate-12 transition-transform" />
                  Generate Video
                  <ArrowRight size={24} />
                </button>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-3">
                  <AlertCircle size={20} />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 space-y-8"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-24 h-24 border-4 border-brand-100 border-t-brand-600 rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center text-brand-600">
                  <Sparkles size={32} />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Magic in progress...</h2>
                <p className="text-slate-500 font-medium">{loadingStatus}</p>
              </div>
            </motion.div>
          )}

          {step === 'editor' && project && (
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-12 gap-8"
            >
              <div className="col-span-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Layout size={24} className="text-brand-600" />
                    Scene Editor
                  </h2>
                  <div className="flex items-center gap-3">
                    <button className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      Save Draft
                    </button>
                    <button 
                      onClick={generateAllAssets}
                      className="px-6 py-2 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-100"
                    >
                      Finalize Video
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {project.scenes.map((scene, index) => (
                    <motion.div
                      key={scene.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="glass-panel p-6 rounded-2xl flex gap-6 group hover:border-brand-200 transition-all"
                    >
                      <div className="w-48 aspect-video bg-slate-100 rounded-xl overflow-hidden relative flex-shrink-0">
                        {scene.imageUrl ? (
                          <img src={scene.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ImageIcon size={32} />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">
                          Scene {index + 1}
                        </div>
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        <textarea
                          value={scene.text}
                          onChange={(e) => {
                            const newScenes = [...project.scenes];
                            newScenes[index].text = e.target.value;
                            setProject({ ...project, scenes: newScenes });
                          }}
                          className="w-full bg-transparent border-none p-0 focus:ring-0 text-slate-700 font-medium resize-none"
                          rows={2}
                        />
                        <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <Mic size={14} />
                            Voice: Kore
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <RefreshCw size={14} className="cursor-pointer hover:text-brand-500 transition-colors" />
                            Regenerate Visual
                          </div>
                          {scene.imageUrl && (
                            <a 
                              href={scene.imageUrl} 
                              download={`scene-${index + 1}.png`}
                              className="flex items-center gap-1.5 text-xs font-bold text-brand-600 uppercase tracking-wider hover:text-brand-700 transition-colors"
                            >
                              <Download size={14} />
                              Download Image
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col justify-between">
                        <button className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={20} />
                        </button>
                        <div className="text-xs font-bold text-slate-400">{scene.duration}s</div>
                      </div>
                    </motion.div>
                  ))}
                  <button className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold flex items-center justify-center gap-2 hover:border-brand-300 hover:text-brand-500 transition-all">
                    <Plus size={20} />
                    Add Scene
                  </button>
                </div>
              </div>

              <div className="col-span-4 space-y-6">
                <div className="glass-panel p-6 rounded-2xl sticky top-24 space-y-6">
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <Settings size={20} className="text-brand-600" />
                    Project Settings
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Brand Voice</label>
                      <select className="w-full bg-slate-50 border-slate-100 rounded-xl text-sm font-semibold p-3">
                        <option>Kore (Professional)</option>
                        <option>Fenrir (Energetic)</option>
                        <option>Zephyr (Calm)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Background Music</label>
                      <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Music size={16} className="text-brand-500" />
                          <span className="text-sm font-semibold">Corporate Uplift</span>
                        </div>
                        <button className="text-xs font-bold text-brand-600">Change</button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Brand Color</label>
                      <div className="flex gap-2">
                        {['#0c91eb', '#8b5cf6', '#ec4899', '#10b981'].map(color => (
                          <button 
                            key={color}
                            className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        <button className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                      <span>Estimated Length</span>
                      <span>~45 seconds</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-700">
                      <span>Resolution</span>
                      <span>1080p (Full HD)</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'preview' && project && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setStep('editor')}
                  className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition-colors"
                >
                  <ChevronLeft size={20} />
                  Back to Editor
                </button>
                <div className="flex items-center gap-2 text-green-600 font-bold">
                  <CheckCircle2 size={20} />
                  Generation Complete
                </div>
              </div>

              <VideoPreview project={project} />

              <div className="grid grid-cols-3 gap-6">
                <div className="glass-panel p-6 rounded-2xl text-center space-y-2">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Layout size={20} />
                  </div>
                  <h4 className="font-bold text-slate-900">TikTok</h4>
                  <p className="text-xs text-slate-500">Optimized for 9:16</p>
                  <button 
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${project.title.replace(/\s+/g, '_')}_tiktok_project.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="text-sm font-bold text-brand-600 pt-2"
                  >
                    Export Project
                  </button>
                </div>
                <div className="glass-panel p-6 rounded-2xl text-center space-y-2">
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Layout size={20} />
                  </div>
                  <h4 className="font-bold text-slate-900">Instagram</h4>
                  <p className="text-xs text-slate-500">Reels & Stories</p>
                  <button 
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${project.title.replace(/\s+/g, '_')}_instagram_project.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="text-sm font-bold text-brand-600 pt-2"
                  >
                    Export Project
                  </button>
                </div>
                <div className="glass-panel p-6 rounded-2xl text-center space-y-2">
                  <div className="w-10 h-10 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Layout size={20} />
                  </div>
                  <h4 className="font-bold text-slate-900">YouTube</h4>
                  <p className="text-xs text-slate-500">Shorts format</p>
                  <button 
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${project.title.replace(/\s+/g, '_')}_youtube_project.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="text-sm font-bold text-brand-600 pt-2"
                  >
                    Export Project
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t bg-white">
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center text-slate-400 text-sm font-medium">
          <p>© 2026 ShortVibe AI. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-600">Privacy Policy</a>
            <a href="#" className="hover:text-slate-600">Terms of Service</a>
            <a href="#" className="hover:text-slate-600">API Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
