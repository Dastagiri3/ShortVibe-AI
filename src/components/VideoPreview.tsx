import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Download, 
  Layers, 
  Type as TypeIcon, 
  Music, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Volume2,
  RefreshCw
} from 'lucide-react';
import { Scene, VideoProject } from '../services/aiService';

interface VideoPreviewProps {
  project: VideoProject;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ project }) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const currentScene = project.scenes[currentSceneIndex];

  useEffect(() => {
    if (isPlaying) {
      startPlayback();
    } else {
      stopPlayback();
    }
    return () => stopPlayback();
  }, [isPlaying, currentSceneIndex]);

  const startPlayback = () => {
    if (currentScene?.audioUrl) {
      const audio = new Audio(currentScene.audioUrl);
      audioRef.current = audio;
      
      audio.onerror = (e) => {
        console.error("Audio failed to load:", e);
        // Fallback to timer-based progression if audio fails
      };

      audio.play().catch(e => {
        console.error("Audio play failed:", e);
        // This can happen if the user hasn't interacted with the page yet
        setIsPlaying(false);
      });

      audio.onended = () => {
        if (currentSceneIndex < project.scenes.length - 1) {
          setCurrentSceneIndex(prev => prev + 1);
          setProgress(0);
        } else {
          setIsPlaying(false);
          setCurrentSceneIndex(0);
          setProgress(0);
        }
      };
    }

    const startTime = Date.now();
    const duration = (currentScene?.duration || 5) * 1000;

    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress >= 100 && !currentScene?.audioUrl) {
        if (currentSceneIndex < project.scenes.length - 1) {
          setCurrentSceneIndex(prev => prev + 1);
          setProgress(0);
        } else {
          setIsPlaying(false);
          setCurrentSceneIndex(0);
          setProgress(0);
        }
      }
    }, 50);
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const handleTogglePlay = () => setIsPlaying(!isPlaying);

  const handlePrev = () => {
    setCurrentSceneIndex(prev => Math.max(0, prev - 1));
    setProgress(0);
  };

  const handleNext = () => {
    setCurrentSceneIndex(prev => Math.min(project.scenes.length - 1, prev + 1));
    setProgress(0);
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const handleExport = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    setExportProgress(0);
    setIsPlaying(false);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stream = canvas.captureStream(30); // 30 FPS
    const audioContext = new AudioContext();
    const audioDestination = audioContext.createMediaStreamDestination();
    
    const combinedStream = new MediaStream([
      ...stream.getVideoTracks(),
      ...audioDestination.stream.getAudioTracks()
    ]);

    const recorder = new MediaRecorder(combinedStream, {
      mimeType: 'video/webm;codecs=vp9,opus'
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/\s+/g, '_')}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      setIsExporting(false);
      setExportProgress(0);
      setCurrentSceneIndex(0);
      setProgress(0);
    };

    recorder.start();

    // Play through each scene and draw to canvas
    for (let i = 0; i < project.scenes.length; i++) {
      const scene = project.scenes[i];
      setCurrentSceneIndex(i);
      setExportProgress(((i + 1) / project.scenes.length) * 100);

      // Load image
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = scene.imageUrl || "";
      await new Promise((resolve) => { img.onload = resolve; });

      // Load and play audio
      let audioSource: AudioBufferSourceNode | null = null;
      if (scene.audioUrl) {
        const audioData = await fetch(scene.audioUrl).then(r => r.arrayBuffer());
        const audioBuffer = await audioContext.decodeAudioData(audioData);
        audioSource = audioContext.createBufferSource();
        audioSource.buffer = audioBuffer;
        audioSource.connect(audioDestination);
        audioSource.connect(audioContext.destination);
        audioSource.start();
      }

      const duration = (scene.duration || 5) * 1000;
      const startTime = Date.now();
      
      while (Date.now() - startTime < duration) {
        const elapsed = Date.now() - startTime;
        const sceneProgress = elapsed / duration;
        
        // Clear canvas
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw image with Ken Burns
        const scale = 1 + (sceneProgress * 0.2);
        const x = -(canvas.width * (scale - 1)) / 2;
        const y = -(canvas.height * (scale - 1)) / 2;
        ctx.drawImage(img, x, y, canvas.width * scale, canvas.height * scale);

        // Draw overlay text
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, canvas.height - 150, canvas.width, 150);
        
        ctx.fillStyle = project.brandKit?.primaryColor || 'white';
        ctx.font = 'bold 48px Outfit';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 10;
        
        // Wrap text
        const words = scene.text.split(' ');
        let line = '';
        let yPos = canvas.height - 100;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > canvas.width - 100 && n > 0) {
            ctx.fillText(line, canvas.width / 2, yPos);
            line = words[n] + ' ';
            yPos += 60;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, canvas.width / 2, yPos);

        await new Promise(r => requestAnimationFrame(r));
      }
      
      if (audioSource) audioSource.stop();
    }

    recorder.stop();
    await audioContext.close();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Hidden Canvas for Export */}
      <canvas 
        ref={canvasRef} 
        width={project.aspectRatio === '16:9' ? 1920 : project.aspectRatio === '1:1' ? 1080 : 1080}
        height={project.aspectRatio === '16:9' ? 1080 : project.aspectRatio === '1:1' ? 1080 : 1920}
        className="hidden"
      />

      <div className={`relative aspect-[${project.aspectRatio === '9:16' ? '9/16' : project.aspectRatio === '1:1' ? '1/1' : '16/9'}] bg-black rounded-2xl overflow-hidden shadow-2xl group`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSceneIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            {currentScene?.imageUrl ? (
              <img 
                src={currentScene.imageUrl} 
                alt={currentScene.text}
                className="w-full h-full object-cover ken-burns"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-800">
                <div className="animate-pulse text-slate-500">Generating Visual...</div>
              </div>
            )}
            
            {/* Overlay Captions */}
            <div className="absolute inset-x-0 bottom-12 px-8 text-center">
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-white text-2xl font-bold drop-shadow-lg leading-tight"
                style={{ color: project.brandKit?.primaryColor || '#ffffff' }}
              >
                {currentScene?.text}
              </motion.p>
            </div>

            {/* Logo Overlay */}
            {project.brandKit?.logo && (
              <div className="absolute top-6 right-6 w-16 h-16 opacity-80">
                <img src={project.brandKit.logo} alt="Logo" className="w-full h-full object-contain" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
          <motion.div 
            className="h-full bg-brand-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={handlePrev} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <SkipBack size={20} />
          </button>
          <button 
            onClick={handleTogglePlay}
            className="w-12 h-12 bg-brand-600 text-white rounded-full flex items-center justify-center hover:bg-brand-700 transition-all shadow-lg hover:scale-105 active:scale-95"
          >
            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} className="ml-1" fill="currentColor" />}
          </button>
          <button onClick={handleNext} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <SkipForward size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <span>Scene {currentSceneIndex + 1}</span>
          <span>/</span>
          <span>{project.scenes.length}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Volume2 size={18} />
            <div className="w-20 h-1 bg-slate-200 rounded-full overflow-hidden">
              <div className="w-3/4 h-full bg-brand-400" />
            </div>
          </div>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] justify-center"
          >
            {isExporting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                {Math.round(exportProgress)}%
              </>
            ) : (
              <>
                <Download size={16} />
                Export MP4
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
