let currentActiveAudio = null;

// Stop any currently playing audio (base64 TTS, HTML5 audio, speech synthesis)
export const stopActiveAudio = () => {
  if (currentActiveAudio) {
    try {
      currentActiveAudio.pause();
      currentActiveAudio.currentTime = 0;
    } catch (e) {}
    currentActiveAudio = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
};

// Play base64 audio returned from backend TTS
export const playBase64Audio = (base64String, mimeType = 'audio/wav') => {
  stopActiveAudio();
  return new Promise((resolve, reject) => {
    const audio = new Audio(`data:${mimeType};base64,${base64String}`);
    currentActiveAudio = audio;
    audio.onended = () => {
      if (currentActiveAudio === audio) currentActiveAudio = null;
      resolve();
    };
    audio.onerror = (err) => {
      if (currentActiveAudio === audio) currentActiveAudio = null;
      reject(err);
    };
    audio.play().catch((err) => {
      if (currentActiveAudio === audio) currentActiveAudio = null;
      reject(err);
    });
  });
};

// Record audio from microphone
export const startRecording = async (existingStream = null) => {
  const stream = existingStream || await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const chunks = [];

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  mediaRecorder.start();

  return {
    stop: () => new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        if (!existingStream) {
          stream.getTracks().forEach(t => t.stop());
        }
        resolve(blob);
      };
      mediaRecorder.stop();
    }),
  };
};

// Convert blob to FormData for API upload
export const blobToFormData = (blob, filename = 'audio.wav') => {
  const formData = new FormData();
  formData.append('audio', blob, filename);
  return formData;
};