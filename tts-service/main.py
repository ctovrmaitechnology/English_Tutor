from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from kokoro import KPipeline
import soundfile as sf
import numpy as np
import io

app = FastAPI(title="TTS Service - Kokoro", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading Kokoro American English pipeline...")
pipeline_american = KPipeline(lang_code='a')

print("Loading Kokoro British English pipeline...")
pipeline_british = KPipeline(lang_code='b')

print("✅ Kokoro TTS ready!")

BRITISH_VOICES = {'bf_emma', 'bf_isabella', 'bm_george', 'bm_lewis'}

def get_pipeline(voice: str):
    return pipeline_british if voice in BRITISH_VOICES else pipeline_american

@app.post("/synthesize")
async def synthesize(payload: dict):
    text  = payload.get("text", "").strip()
    voice = payload.get("voice", "af_bella")
    speed = float(payload.get("speed", 1.1))

    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    try:
        pipe = get_pipeline(voice)
        audio_chunks = []

        for _, _, audio in pipe(text, voice=voice, speed=speed):
            if audio is not None:
                audio_chunks.append(audio)

        if not audio_chunks:
            raise ValueError("No audio generated")

        combined = np.concatenate(audio_chunks)
        buffer   = io.BytesIO()
        sf.write(buffer, combined, 24000, format='WAV')
        buffer.seek(0)

        return Response(
            content=buffer.read(),
            media_type="audio/wav",
        )

    except Exception as e:
        print(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "ok", "engine": "Kokoro"}

@app.get("/voices")
def list_voices():
    return {
        "american_female": ["af_heart", "af_bella", "af_sarah", "af_nicole"],
        "american_male":   ["am_adam", "am_michael"],
        "british_female":  ["bf_emma", "bf_isabella"],
        "british_male":    ["bm_george", "bm_lewis"],
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5002)