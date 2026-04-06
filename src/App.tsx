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
  generateSceneVideo,
  generateBackgroundMusic,
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
    
    try {
      setLoadingStatus('Generating background music...');
      const musicUrl = await generateBackgroundMusic(`A ${style} background track for a video about: ${project.title}`);
      setProject(prev => prev ? { ...prev, backgroundMusicUrl: musicUrl } : null);
    } catch (err) {
      console.error("Music generation failed:", err);
    }

    for (let i = 0; i < updatedScenes.length; i++) {
      setLoadingStatus(`Processing scene ${i + 1} of ${updatedScenes.length}...`);
      try {
        if (!updatedScenes[i].videoUrl) {
          setLoadingStatus(`Generating video for scene ${i + 1}...`);
          updatedScenes[i].videoUrl = await generateSceneVideo(updatedScenes[i].imagePrompt, style, aspectRatio);
          // Small delay between video and audio generation
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        if (!updatedScenes[i].audioUrl) {
          setLoadingStatus(`Generating voiceover for scene ${i + 1}...`);
          updatedScenes[i].audioUrl = await generateSceneAudio(updatedScenes[i].text);
        }
        setProject(prev => prev ? { ...prev, scenes: updatedScenes } : null);
        
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
    <div className="min-h-screen flex flex-col relative">
      {/* Animated Background */}
      <div className="animated-bg">
        <div className="blob" style={{ top: '10%', left: '10%' }} />
        <div className="blob" style={{ bottom: '10%', right: '10%', animationDelay: '-5s' }} />
        <div className="blob" style={{ top: '40%', right: '20%', animationDelay: '-10s', width: '300px', height: '300px' }} />
      </div>

      {/* Navbar */}
      <nav className="h-16 border-b border-white/10 bg-black/20 backdrop-blur-lg flex items-center justify-between px-8 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
            <Video size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">ShortVibe</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <Settings size={20} />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500 to-purple-500 border border-white/20" />
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8">
        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              <div className="text-center space-y-4">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-6xl font-extrabold tracking-tight text-white"
                >
                  Turn your words into <span className="gradient-text">cinematic magic</span>
                </motion.h1>
                <p className="text-xl text-slate-400 max-w-xl mx-auto">
                  Paste your script. Our AI handles the video generation, voiceover, and background music.
                </p>
              </div>

              <div className="glass-panel p-8 rounded-3xl space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Your Script</label>
                  <textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder="Describe your story or paste a script..."
                    className="w-full h-64 p-6 rounded-2xl bg-white/5 border-2 border-white/10 text-white focus:border-brand-500 focus:ring-0 transition-all resize-none text-lg placeholder:text-slate-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Visual Style</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['cinematic', 'illustrated', 'corporate'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setStyle(s)}
                          className={`py-3 px-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                            style === s 
                            ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' 
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Aspect Ratio</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['9:16', '1:1', '16:9'] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setAspectRatio(r)}
                          className={`py-3 px-2 rounded-xl text-sm font-semibold transition-all ${
                            aspectRatio === r 
                            ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' 
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
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
                  className="w-full py-5 bg-white text-slate-950 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 hover:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-xl shadow-white/10"
                >
                  <Sparkles size={24} className="text-brand-600 group-hover:rotate-12 transition-transform" />
                  Generate AI Video
                  <ArrowRight size={24} />
                </button>
              </div>
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
                  className="w-32 h-32 border-4 border-white/5 border-t-brand-500 rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center text-brand-500">
                  <Sparkles size={40} className="animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-3">
                <h2 className="text-3xl font-bold text-white">Crafting your masterpiece</h2>
                <p className="text-slate-400 font-medium text-lg">{loadingStatus}</p>
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
                  <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Layout size={28} className="text-brand-500" />
                    Storyboards
                  </h2>
                  <div className="flex items-center gap-3">
                    <button className="px-6 py-2.5 text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors border border-white/10">
                      Save Draft
                    </button>
                    <button 
                      onClick={generateAllAssets}
                      className="px-8 py-2.5 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20"
                    >
                      Render Final Video
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
                      className="glass-panel p-6 rounded-3xl flex gap-6 group hover:border-brand-500/30 transition-all"
                    >
                      <div className="w-56 aspect-video bg-white/5 rounded-2xl overflow-hidden relative flex-shrink-0 border border-white/10">
                        {scene.videoUrl ? (
                          <video src={scene.videoUrl} className="w-full h-full object-cover" autoPlay muted loop />
                        ) : scene.imageUrl ? (
                          <img src={scene.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <ImageIcon size={40} />
                          </div>
                        )}
                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-widest border border-white/10">
                          Scene {index + 1}
                        </div>
                      </div>
                      
                      <div className="flex-1 space-y-4">
                        <textarea
                          value={scene.text}
                          onChange={(e) => {
                            const newScenes = [...project.scenes];
                            newScenes[index].text = e.target.value;
                            setProject({ ...project, scenes: newScenes });
                          }}
                          className="w-full bg-transparent border-none p-0 focus:ring-0 text-white font-medium resize-none text-lg leading-relaxed"
                          rows={2}
                        />
                        <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <Mic size={16} className="text-brand-500" />
                            Voice: Kore
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <RefreshCw size={16} className="cursor-pointer hover:text-brand-500 transition-colors" />
                            Regenerate
                          </div>
                          {scene.videoUrl && (
                            <a 
                              href={scene.videoUrl} 
                              download={`scene-${index + 1}.mp4`}
                              className="flex items-center gap-2 text-xs font-bold text-brand-400 uppercase tracking-wider hover:text-brand-300 transition-colors"
                            >
                              <Download size={16} />
                              Download Clip
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col justify-between">
                        <button className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                          <Trash2 size={24} />
                        </button>
                        <div className="text-sm font-bold text-slate-500">{scene.duration}s</div>
                      </div>
                    </motion.div>
                  ))}
                  <button className="w-full py-6 border-2 border-dashed border-white/10 rounded-3xl text-slate-500 font-bold flex items-center justify-center gap-3 hover:border-brand-500/50 hover:text-brand-400 transition-all bg-white/5">
                    <Plus size={24} />
                    Add New Scene
                  </button>
                </div>
              </div>

              <div className="col-span-4 space-y-6">
                <div className="glass-panel p-8 rounded-3xl sticky top-24 space-y-8">
                  <h3 className="font-bold text-xl text-white flex items-center gap-3">
                    <Settings size={24} className="text-brand-500" />
                    Project Config
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Narrator Voice</label>
                      <select className="w-full bg-white/5 border-white/10 rounded-xl text-sm font-semibold p-4 text-white focus:ring-brand-500">
                        <option className="bg-slate-900">Kore (Professional)</option>
                        <option className="bg-slate-900">Fenrir (Energetic)</option>
                        <option className="bg-slate-900">Zephyr (Calm)</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Background Music</label>
                      <div className="p-4 bg-white/5 rounded-xl flex items-center justify-between border border-white/10">
                        <div className="flex items-center gap-3">
                          <Music size={18} className="text-brand-500" />
                          <span className="text-sm font-semibold text-white">AI Generated Track</span>
                        </div>
                        <button className="text-xs font-bold text-brand-400 hover:text-brand-300">Regenerate</button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Brand Palette</label>
                      <div className="flex gap-3">
                        {['#0c91eb', '#8b5cf6', '#ec4899', '#10b981'].map(color => (
                          <button 
                            key={color}
                            className={`w-10 h-10 rounded-full border-2 shadow-lg transition-all ${project?.brandKit?.primaryColor === color ? 'border-white scale-110' : 'border-white/20'}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setProject(prev => prev ? { ...prev, brandKit: { ...prev.brandKit, primaryColor: color, secondaryColor: color, logo: prev.brandKit?.logo || '' } } : null)}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Brand Logo</label>
                      <div className="flex items-center gap-4">
                        {project?.brandKit?.logo ? (
                          <div className="relative w-16 h-16 bg-white/5 rounded-xl border border-white/10 p-2 group">
                            <img src={project.brandKit.logo} alt="Logo" className="w-full h-full object-contain" />
                            <button 
                              onClick={() => setProject(prev => prev ? { ...prev, brandKit: { ...prev.brandKit, logo: '', primaryColor: prev.brandKit?.primaryColor || '#0c91eb', secondaryColor: prev.brandKit?.secondaryColor || '#0c91eb' } } : null)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ) : (
                          <label className="w-16 h-16 bg-white/5 rounded-xl border border-dashed border-white/20 flex items-center justify-center text-slate-500 hover:text-white hover:border-white/40 transition-all cursor-pointer">
                            <Plus size={24} />
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setProject(prev => prev ? { 
                                      ...prev, 
                                      brandKit: { 
                                        logo: reader.result as string,
                                        primaryColor: prev.brandKit?.primaryColor || '#0c91eb',
                                        secondaryColor: prev.brandKit?.secondaryColor || '#0c91eb'
                                      } 
                                    } : null);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">Upload Brand Logo</p>
                          <p className="text-xs text-slate-500">PNG or SVG recommended</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/10 space-y-3">
                    <div className="flex justify-between text-sm font-bold text-slate-300">
                      <span>Total Duration</span>
                      <span className="text-white">~45 seconds</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-300">
                      <span>Output Quality</span>
                      <span className="text-white">720p (HD)</span>
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
                  className="flex items-center gap-2 text-slate-400 font-bold hover:text-white transition-colors"
                >
                  <ChevronLeft size={20} />
                  Back to Storyboards
                </button>
                <div className="flex items-center gap-2 text-green-400 font-bold">
                  <CheckCircle2 size={20} />
                  Video Ready
                </div>
              </div>

              <VideoPreview project={project} />

              <div className="grid grid-cols-3 gap-6">
                <div className="glass-panel p-8 rounded-3xl text-center space-y-3 hover:border-brand-500/30 transition-all">
                  <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <Layout size={24} />
                  </div>
                  <h4 className="font-bold text-white">TikTok</h4>
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
                    className="text-sm font-bold text-brand-400 pt-3 hover:text-brand-300 block w-full"
                  >
                    Export Project
                  </button>
                </div>
                <div className="glass-panel p-8 rounded-3xl text-center space-y-3 hover:border-brand-500/30 transition-all">
                  <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <Layout size={24} />
                  </div>
                  <h4 className="font-bold text-white">Instagram</h4>
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
                    className="text-sm font-bold text-brand-400 pt-3 hover:text-brand-300 block w-full"
                  >
                    Export Project
                  </button>
                </div>
                <div className="glass-panel p-8 rounded-3xl text-center space-y-3 hover:border-brand-500/30 transition-all">
                  <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <Layout size={24} />
                  </div>
                  <h4 className="font-bold text-white">YouTube</h4>
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
                    className="text-sm font-bold text-brand-400 pt-3 hover:text-brand-300 block w-full"
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
      <footer className="py-12 border-t border-white/10 bg-black/20 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center text-slate-500 text-sm font-medium">
          <p>© 2026 ShortVibe AI. All rights reserved.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">API Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
