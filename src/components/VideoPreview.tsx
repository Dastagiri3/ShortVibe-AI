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
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
    // Background Music
    if (project.backgroundMusicUrl && !bgMusicRef.current) {
      const bgMusic = new Audio(project.backgroundMusicUrl);
      bgMusic.loop = true;
      bgMusic.volume = 0.3;
      bgMusicRef.current = bgMusic;
      bgMusic.play().catch(console.error);
    } else if (bgMusicRef.current) {
      bgMusicRef.current.play().catch(console.error);
    }

    // Scene Voiceover
    if (currentScene?.audioUrl) {
      const audio = new Audio(currentScene.audioUrl);
      audioRef.current = audio;
      audio.play().catch(console.error);
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

    // Scene Video
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(console.error);
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
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
    }
    if (videoRef.current) {
      videoRef.current.pause();
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

    // Load Background Music
    let bgMusicSource: AudioBufferSourceNode | null = null;
    if (project.backgroundMusicUrl) {
      const bgMusicData = await fetch(project.backgroundMusicUrl).then(r => r.arrayBuffer());
      const bgMusicBuffer = await audioContext.decodeAudioData(bgMusicData);
      bgMusicSource = audioContext.createBufferSource();
      bgMusicSource.buffer = bgMusicBuffer;
      bgMusicSource.loop = true;
      const bgGain = audioContext.createGain();
      bgGain.gain.value = 0.3;
      bgMusicSource.connect(bgGain);
      bgGain.connect(audioDestination);
      bgMusicSource.start();
    }

    // Load Logo if exists
    let logoImg: HTMLImageElement | null = null;
    if (project.brandKit?.logo) {
      logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.src = project.brandKit.logo;
      await new Promise((resolve) => { logoImg!.onload = resolve; });
    }

    // Play through each scene and draw to canvas
    for (let i = 0; i < project.scenes.length; i++) {
      const scene = project.scenes[i];
      setCurrentSceneIndex(i);
      setExportProgress(((i + 1) / project.scenes.length) * 100);

      // Load video or image
      let video: HTMLVideoElement | null = null;
      let img: HTMLImageElement | null = null;

      if (scene.videoUrl) {
        video = document.createElement('video');
        video.src = scene.videoUrl;
        video.crossOrigin = "anonymous";
        video.muted = true;
        await new Promise((resolve) => { video!.onloadeddata = resolve; });
        video.play();
      } else {
        img = new Image();
        img.crossOrigin = "anonymous";
        img.src = scene.imageUrl || "";
        await new Promise((resolve) => { img!.onload = resolve; });
      }

      // Load and play voiceover
      let audioSource: AudioBufferSourceNode | null = null;
      if (scene.audioUrl) {
        const audioData = await fetch(scene.audioUrl).then(r => r.arrayBuffer());
        const audioBuffer = await audioContext.decodeAudioData(audioData);
        audioSource = audioContext.createBufferSource();
        audioSource.buffer = audioBuffer;
        audioSource.connect(audioDestination);
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

        if (video) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } else if (img) {
          // Draw image with Ken Burns
          const scale = 1 + (sceneProgress * 0.2);
          const x = -(canvas.width * (scale - 1)) / 2;
          const y = -(canvas.height * (scale - 1)) / 2;
          ctx.drawImage(img, x, y, canvas.width * scale, canvas.height * scale);
        }

        // Draw Logo Overlay
        if (logoImg) {
          const logoSize = canvas.width * 0.1; // 10% of width
          const padding = 40;
          ctx.globalAlpha = 0.9;
          ctx.drawImage(logoImg, canvas.width - logoSize - padding, padding, logoSize, logoSize);
          ctx.globalAlpha = 1.0;
        }

        // Draw overlay text
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, canvas.height - 200, canvas.width, 200);
        
        ctx.fillStyle = project.brandKit?.primaryColor || 'white';
        ctx.font = 'bold 54px Outfit';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 15;
        
        // Wrap text
        const words = scene.text.split(' ');
        let line = '';
        let yPos = canvas.height - 120;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > canvas.width - 120 && n > 0) {
            ctx.fillText(line, canvas.width / 2, yPos);
            line = words[n] + ' ';
            yPos += 70;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, canvas.width / 2, yPos);

        await new Promise(r => requestAnimationFrame(r));
      }
      
      if (audioSource) audioSource.stop();
      if (video) video.pause();
    }

    if (bgMusicSource) bgMusicSource.stop();
    recorder.stop();
    await audioContext.close();
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Hidden Canvas for Export */}
      <canvas 
        ref={canvasRef} 
        width={project.aspectRatio === '16:9' ? 1280 : project.aspectRatio === '1:1' ? 1080 : 720}
        height={project.aspectRatio === '16:9' ? 720 : project.aspectRatio === '1:1' ? 1080 : 1280}
        className="hidden"
      />

      <div className={`relative aspect-[${project.aspectRatio === '9:16' ? '9/16' : project.aspectRatio === '1:1' ? '1/1' : '16/9'}] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSceneIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            {currentScene?.videoUrl ? (
              <video 
                ref={videoRef}
                src={currentScene.videoUrl} 
                className="w-full h-full object-cover"
                muted
                playsInline
              />
            ) : currentScene?.imageUrl ? (
              <img 
                src={currentScene.imageUrl} 
                alt={currentScene.text}
                className="w-full h-full object-cover ken-burns"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-900">
                <div className="animate-pulse text-slate-600 font-bold">Rendering Scene...</div>
              </div>
            )}
            
            {/* Overlay Captions */}
            <div className="absolute inset-x-0 bottom-16 px-10 text-center">
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-white text-3xl font-bold drop-shadow-2xl leading-tight bg-black/30 backdrop-blur-sm py-4 px-6 rounded-2xl inline-block"
                style={{ color: project.brandKit?.primaryColor || '#ffffff' }}
              >
                {currentScene?.text}
              </motion.p>
            </div>

            {/* Logo Overlay */}
            {project.brandKit?.logo && (
              <div className="absolute top-8 right-8 w-20 h-20 opacity-90 drop-shadow-lg">
                <img src={project.brandKit.logo} alt="Logo" className="w-full h-full object-contain" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-white/10">
          <motion.div 
            className="h-full bg-brand-500 shadow-[0_0_15px_rgba(12,145,235,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={handlePrev} className="p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all">
            <SkipBack size={24} />
          </button>
          <button 
            onClick={handleTogglePlay}
            className="w-16 h-16 bg-white text-slate-950 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
          >
            {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} className="ml-1" fill="currentColor" />}
          </button>
          <button onClick={handleNext} className="p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all">
            <SkipForward size={24} />
          </button>
        </div>

        <div className="flex items-center gap-3 text-sm font-bold text-slate-400">
          <span className="text-white">Scene {currentSceneIndex + 1}</span>
          <span className="opacity-30">/</span>
          <span>{project.scenes.length}</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 text-slate-500">
            <Volume2 size={20} />
            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="w-3/4 h-full bg-brand-500" />
            </div>
          </div>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-3 px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] justify-center shadow-lg shadow-brand-500/20"
          >
            {isExporting ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                {Math.round(exportProgress)}%
              </>
            ) : (
              <>
                <Download size={18} />
                Export MP4
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
