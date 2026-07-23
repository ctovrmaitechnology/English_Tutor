import os
os.environ["MKL_DISABLE_FAST_MM"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import tempfile

app = FastAPI(title="STT Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model once at startup
print("Loading Whisper model...")
model = WhisperModel("tiny.en", device="cpu", compute_type="float32", cpu_threads=2)
print("Whisper model ready")


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    """
    Accepts an audio file (WAV/MP3/WEBM) and returns the transcript.
    """
    if not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be an audio file")

    suffix = os.path.splitext(audio.filename or "audio.wav")[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        segments, info = model.transcribe(
            tmp_path,
            language="en",
            beam_size=1,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
        )

        transcript = " ".join(segment.text.strip() for segment in segments)

        return {
            "transcript": transcript.strip(),
            "language": info.language,
            "duration": info.duration,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.unlink(tmp_path)


@app.get("/health")
def health():
    return {"status": "ok", "model": "faster-whisper tiny.en"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)