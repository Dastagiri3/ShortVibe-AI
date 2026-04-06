import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });

async function withRetry<T>(fn: () => Promise<T>, maxRetries: number = 8): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errStr = JSON.stringify(err);
      const isRetryable = 
        errStr.includes('429') || 
        errStr.includes('RESOURCE_EXHAUSTED') ||
        errStr.includes('500') ||
        errStr.includes('Rpc failed') ||
        (err.message && (
          err.message.includes('429') || 
          err.message.includes('RESOURCE_EXHAUSTED') ||
          err.message.includes('500') ||
          err.message.includes('Rpc failed')
        ));
      
      if (isRetryable && i < maxRetries - 1) {
        // Exponential backoff
        const delay = Math.pow(2, i) * 4000 + Math.random() * 2000;
        console.warn(`Retryable error hit (attempt ${i + 1}/${maxRetries}), retrying in ${Math.round(delay)}ms...`, err);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export interface Scene {
  id: string;
  text: string;
  imagePrompt: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  duration: number;
}

export interface VideoProject {
  id: string;
  title: string;
  script: string;
  style: 'cinematic' | 'illustrated' | 'corporate';
  aspectRatio: '9:16' | '1:1' | '16:9';
  scenes: Scene[];
  backgroundMusicUrl?: string;
  brandKit?: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
  };
}

export async function generateSceneVideo(prompt: string, style: string, aspectRatio: '9:16' | '16:9' | '1:1'): Promise<string> {
  const fullPrompt = `A high-quality ${style} style video: ${prompt}. Professional lighting, detailed textures, smooth movement.`;
  
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-lite-generate-preview',
    prompt: fullPrompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio === '1:1' ? '16:9' : aspectRatio // Veo lite only supports 16:9 or 9:16
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Failed to generate video");

  const response = await fetch(downloadLink, {
    method: 'GET',
    headers: {
      'x-goog-api-key': process.env.GEMINI_API_KEY || "",
    },
  });

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function generateBackgroundMusic(prompt: string): Promise<string> {
  const response = await ai.models.generateContentStream({
    model: "lyria-3-clip-preview",
    contents: `Generate a 30-second background music track: ${prompt}.`,
  });

  let audioBase64 = "";
  let mimeType = "audio/wav";

  for await (const chunk of response) {
    const parts = chunk.candidates?.[0]?.content?.parts;
    if (!parts) continue;
    for (const part of parts) {
      if (part.inlineData?.data) {
        if (!audioBase64 && part.inlineData.mimeType) {
          mimeType = part.inlineData.mimeType;
        }
        audioBase64 += part.inlineData.data;
      }
    }
  }

  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

export async function segmentTextIntoScenes(text: string, style: string): Promise<Scene[]> {
  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Segment the following text into 3-12 logical video scenes. For each scene, provide the spoken text and a detailed visual description for an image generator. The style is ${style}.
    
    Text: ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "The spoken text for this scene" },
            imagePrompt: { type: Type.STRING, description: "A detailed visual description for image generation" },
            duration: { type: Type.NUMBER, description: "Estimated duration in seconds (3-8s)" }
          },
          required: ["text", "imagePrompt", "duration"]
        }
      }
    }
  }));

  const scenesData = JSON.parse(response.text || "[]");
  return scenesData.map((s: any, i: number) => ({
    id: `scene-${i}`,
    ...s
  }));
}

export async function generateSceneImage(prompt: string, style: string): Promise<string> {
  const fullPrompt = `A high-quality ${style} style image: ${prompt}. Professional lighting, detailed textures.`;
  
  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: fullPrompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K"
      }
    }
  }));

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to generate image");
}

function addWavHeader(base64Pcm: string, sampleRate: number = 24000): string {
  const pcmData = atob(base64Pcm);
  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  // file length
  view.setUint32(4, 36 + pcmData.length, true);
  // RIFF type
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // format chunk identifier
  view.setUint32(12, 0x666d7420, false); // "fmt "
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw PCM)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);

  // data chunk identifier
  view.setUint32(36, 0x64617461, false); // "data"
  // data chunk length
  view.setUint32(40, pcmData.length, true);

  // write PCM data
  for (let i = 0; i < pcmData.length; i++) {
    view.setUint8(44 + i, pcmData.charCodeAt(i));
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export async function generateSceneAudio(text: string, voiceName: string = 'Kore'): Promise<string> {
  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  }));

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    return addWavHeader(base64Audio, 24000);
  }
  throw new Error("Failed to generate audio");
}
