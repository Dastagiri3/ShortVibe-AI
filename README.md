🎬 Text-to-Video Integration

Transforms a structured video export JSON into a fully rendered MP4 — complete with AI-generated scene images, voiceover, animated captions, background music, and Ken Burns motion effects.


How It Works
Your JSON export  (scenes, text, image prompts, durations)
        │
        ▼
 Generate Images   →  Pollinations AI  (free, no key needed)
        │
        ▼
Build Composition  →  Maps scenes → tracks → animations
        │
        ▼
 Submit Render     →  Creatomate API  or  Shotstack API
        │
        ▼
 Poll for Result   →  checks every 5s until complete
        │
        ▼
  Download URL     →  printed to terminal + saved to render_result.json

Features
FeatureDetailsKen Burns motion4 patterns cycle across scenes — zoom in, zoom out, pan left, pan rightBackground musicRoyalty-free orchestral tracks from Pixabay with fade in/outCrossfade transitions0.8s smooth fade between every sceneAnimated captionsText slides up from bottom, fades out at scene endDark overlaySemi-transparent gradient keeps captions readable on any imageTitle cardGold title appears on scene 1 for 3 secondsAuto retryImage generation retries up to 3 times before using a placeholderMulti-formatSupports 9:16 (vertical), 16:9 (landscape), 1:1 (square)

Project Structure
VideoIntegration/
├── creatomate/
│   └── creatomate.js       # Creatomate API integration (recommended)
├── shotstack/
│   └── shotstack.js        # Shotstack API integration (alternative)
├── shared/
│   └── imageGenerator.js   # AI image generation via Pollinations.ai
├── package.json            # Dependencies and npm scripts
├── .env                    # Your API keys (never commit this)
├── .env.example            # Template — copy this to create .env
└── README.md

Prerequisites

Node.js v18 or higher — download at nodejs.org
A Creatomate account — free tier at creatomate.com/sign-up (10 free renders/month)
Your video export JSON — the untitled.json file from your text-to-video generator


Setup
1. Install dependencies
bashnpm install
2. Configure your API key
Copy the environment template and add your key:
bashcp .env.example .env
Open .env and fill in your key:
envCREATOMATE_API_KEY=your_actual_api_key_here
Get your free Creatomate API key from your dashboard at app.creatomate.com.

Usage
Run with Creatomate (recommended)
bashnode creatomate/creatomate.js untitled.json
Run with Shotstack (alternative)
bashnode shotstack/shotstack.js untitled.json
Using npm scripts
bashnpm start               # runs creatomate by default
npm run shotstack       # runs shotstack
npm run dev             # runs with auto-restart on file changes (requires nodemon)

What Happens When You Run It
🎬  "Untitled Video"
    Scenes: 6  |  Style: cinematic  |  Ratio: 9:16

🖼   Generating scene images...
    Generating image for scene 1/6...
    Generating image for scene 2/6...
    ...
    ✓ 6 images ready

🔧  Building composition...
    ✓ Payload saved → creatomate_payload.json

🚀  Submitting to Creatomate...
    ✓ Render ID: abc123xyz

⏳  Polling every 5s...
    Status: rendering
    Status: rendering
    Status: succeeded

✅  Done!
    📥  https://cdn.creatomate.com/renders/yourfile.mp4
    💾  Saved → render_result.json

Output Files
FileWhat it containsrender_result.jsonRender ID, final MP4 download URL, timestampcreatomate_payload.jsonFull composition sent to Creatomate (useful for debugging)

Your JSON Export Format
The integration expects your export JSON to follow this structure:
json{
  "id": "7xrey7mym",
  "title": "Untitled Video",
  "style": "cinematic",
  "aspectRatio": "9:16",
  "scenes": [
    {
      "id": "scene-0",
      "text": "Over 5,000 years ago, a civilization rose from the desert…",
      "imagePrompt": "Cinematic aerial shot of Sahara Desert at golden hour...",
      "duration": 8
    }
  ]
}
FieldTypeDescriptionstylestringcinematic, epic, or calm — controls background musicaspectRatiostring9:16, 16:9, or 1:1scenes[].textstringNarration text, also used as captionscenes[].imagePromptstringPrompt sent to the image generatorscenes[].durationnumberScene length in seconds

Customisation
Change the background music
Edit the MUSIC_TRACKS object in creatomate/creatomate.js:
jsconst MUSIC_TRACKS = {
  cinematic: "https://your-music-url.mp3",
  epic:      "https://your-music-url.mp3",
  calm:      "https://your-music-url.mp3",
};
Use any direct MP3 URL. Royalty-free sources: Pixabay Music, Free Music Archive.
Change the voiceover
Edit the voice field in buildSceneElements():
jsvoice: "en-US-Neural2-D",   // deep male — cinematic
voice: "en-US-Neural2-F",   // clear female — educational
voice: "en-US-Neural2-J",   // energetic male
Full voice list: Google Neural2 voices
Change caption style
Edit the caption element in buildSceneElements():
jsfont_family:  "Montserrat",   // swap for "Oswald", "Roboto", "Bebas Neue"
font_size:    "6.5 vmin",     // increase for bigger text
fill_color:   "#FFFFFF",      // change caption colour
stroke_color: "#000000",      // change outline colour
Swap the image generator
By default, shared/imageGenerator.js uses Pollinations.ai (free, no key). For production quality, replace the generateImage() function:
DALL-E 3:
jsconst OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateImage(prompt) {
  const res = await client.images.generate({ model: "dall-e-3", prompt, size: "1024x1792" });
  return res.data[0].url;
}
Stable Diffusion (Replicate):
jsconst Replicate = require("replicate");
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

async function generateImage(prompt) {
  const output = await replicate.run("stability-ai/sdxl", { input: { prompt } });
  return output[0];
}

Troubleshooting
Cannot find module '../shared/imageGenerator'
Your file is named differently. Check the shared/ folder — rename the file to imageGenerator.js or update the require() path in creatomate.js to match your actual filename.
CREATOMATE_API_KEY missing in .env
Make sure you created a .env file (not just .env.example) and pasted your actual API key inside it.
Image generation failed for prompt
Pollinations.ai can be unstable with very long prompts. The retry logic will attempt 3 times automatically. If it keeps failing, shorten the imagePrompt values in your JSON to under 200 characters.
Render failed from Creatomate
Check creatomate_payload.json — this file shows exactly what was sent to the API. Common causes: invalid audio URL, unsupported voice ID, or malformed element properties.
Video has no sound
Make sure the music URL in MUSIC_TRACKS is a direct .mp3 link (not a webpage). Test by opening the URL directly in your browser — it should start downloading or playing.

Environment Variables
VariableRequiredDescriptionCREATOMATE_API_KEYYes (for Creatomate)From app.creatomate.comSHOTSTACK_API_KEYYes (for Shotstack)From dashboard.shotstack.ioSHOTSTACK_ENVNostage (default/free) or production

Dependencies
PackageVersionPurposedotenv^16.4.5Loads .env file into process.envnode-fetch^3.3.2HTTP requests to APIs
Dev dependencies (optional):
PackagePurposenodemonAuto-restarts on file save during developmentjestUnit testingprettierCode formatting

License
MIT — free to use, modify, and distribute
