// offscreen.js - Offscreen Document for Tab Audio Capture
// This is the ONLY place in MV3 where getUserMedia with chromeMediaSource:"tab" works.
// Manages audio capture, processing, and OpenAI Realtime API communication.

"use strict";

// ── State ────────────────────────────────────────────────────────────────────
let state = {
  tabId: null,
  apiKey: null,
  streamId: null,

  // Media / Audio
  mediaStream: null,
  audioContext: null,
  sourceNode: null,
  processorNode: null,
  isProcessing: false,

  // WebSocket
  ws: null,
  wsReconnectAttempts: 0,

  // Audio buffering
  currentChunk: [],
  speechDetected: false,
  silenceCounter: 0,
  currentTranslation: "",
  lastTranslationTime: 0,
};

// Constants
const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 4096;
const CHUNK_DURATION_MS = 2500;
const SAMPLES_PER_CHUNK = (SAMPLE_RATE * CHUNK_DURATION_MS) / 1000;
const SILENCE_THRESHOLD = 0.01;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 1000;

// ── Message Listener ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const { action } = request;

  if (action === "startOffscreenCapture") {
    const { streamId, apiKey, tabId } = request;
    console.log("[Offscreen] Received startOffscreenCapture", {
      tabId,
      streamId: streamId?.slice(0, 8) + "...",
    });
    startCapture(streamId, apiKey, tabId)
      .then(() => sendResponse({ success: true }))
      .catch((err) => {
        console.error("[Offscreen] startCapture failed:", err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // async
  }

  if (action === "stopOffscreenCapture") {
    console.log("[Offscreen] Received stopOffscreenCapture");
    stopCapture();
    sendResponse({ success: true });
    return false;
  }
});

// ── Core Functions ────────────────────────────────────────────────────────────

async function startCapture(streamId, apiKey, tabId) {
  // Clean up any previous session
  stopCapture();

  state.streamId = streamId;
  state.apiKey = apiKey;
  state.tabId = tabId;

  // ── 1. Acquire the tab audio stream ───────────────────────────────────────
  console.log("[Offscreen] Calling getUserMedia with tab streamId...");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
      video: false,
    });
    state.mediaStream = stream;
    console.log("[Offscreen] ✅ getUserMedia succeeded – got tab audio stream");
  } catch (err) {
    console.error("[Offscreen] ❌ getUserMedia failed:", err);
    notifyBackground("captureError", { error: err.message });
    throw err;
  }

  // ── 2. Connect to OpenAI ──────────────────────────────────────────────────
  try {
    await connectWebSocket();
  } catch (err) {
    console.error("[Offscreen] ❌ WebSocket connect failed:", err);
    stopCapture();
    notifyBackground("captureError", { error: err.message });
    throw err;
  }

  // ── 3. Start audio processing ─────────────────────────────────────────────
  startAudioProcessing(state.mediaStream);

  notifyBackground("captureStarted", {});
  notifyBackground("statusUpdate", { text: "Listening...", state: "active" });
}

function stopCapture() {
  console.log("[Offscreen] Stopping capture...");

  state.isProcessing = false;

  if (state.ws) {
    try {
      state.ws.close();
    } catch (_) {}
    state.ws = null;
  }

  if (state.processorNode) {
    try {
      state.processorNode.disconnect();
    } catch (_) {}
    state.processorNode = null;
  }

  if (state.sourceNode) {
    try {
      state.sourceNode.disconnect();
    } catch (_) {}
    state.sourceNode = null;
  }

  if (state.audioContext) {
    try {
      state.audioContext.close();
    } catch (_) {}
    state.audioContext = null;
  }

  if (state.mediaStream) {
    state.mediaStream.getTracks().forEach((t) => t.stop());
    state.mediaStream = null;
  }

  state.currentChunk = [];
  state.currentTranslation = "";
  state.speechDetected = false;
  state.silenceCounter = 0;
  state.wsReconnectAttempts = 0;

  console.log("[Offscreen] Capture stopped.");
}

// ── WebSocket ─────────────────────────────────────────────────────────────────

function connectWebSocket() {
  return new Promise((resolve, reject) => {
    const wsUrl =
      "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";
    console.log("[Offscreen] Opening WebSocket to OpenAI Realtime API...");

    const ws = new WebSocket(wsUrl);
    state.ws = ws;

    ws.onopen = () => {
      console.log("[Offscreen] ✅ WebSocket open");
      state.wsReconnectAttempts = 0;
      configureSession(ws);
      resolve();
    };

    ws.onmessage = (event) => handleWsMessage(event);

    ws.onerror = (err) => {
      console.error("[Offscreen] WebSocket error", err);
      reject(new Error("WebSocket connection failed"));
    };

    ws.onclose = (event) => {
      console.log("[Offscreen] WebSocket closed:", event.code, event.reason);
      if (
        state.isProcessing &&
        state.wsReconnectAttempts < MAX_RECONNECT_ATTEMPTS
      ) {
        attemptReconnect();
      }
    };
  });
}

function configureSession(ws) {
  // Authenticate first
  ws.send(
    JSON.stringify({
      type: "auth",
      api_key: state.apiKey,
    }),
  );

  // Configure session
  ws.send(
    JSON.stringify({
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions:
          "You are a real-time translator. Translate the spoken audio to English. Provide only the translation, no explanations or preamble. Be concise and accurate.",
        voice: "alloy",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: null,
        temperature: 0.6,
        max_response_output_tokens: 4096,
      },
    }),
  );

  console.log("[Offscreen] Session configured");
}

function handleWsMessage(event) {
  let message;
  try {
    message = JSON.parse(event.data);
  } catch (e) {
    console.error("[Offscreen] Failed to parse WS message", e);
    return;
  }

  switch (message.type) {
    case "session.created":
    case "session.updated":
      console.log("[Offscreen] Session event:", message.type);
      break;

    case "response.audio_transcript.delta":
    case "response.text.delta":
      if (message.delta) handleTranslationDelta(message.delta);
      break;

    case "response.audio_transcript.done":
      if (message.transcript) handleTranslationComplete(message.transcript);
      break;

    case "response.text.done":
      if (message.text) handleTranslationComplete(message.text);
      break;

    case "response.done":
      console.log("[Offscreen] Response complete");
      break;

    case "error":
      console.error("[Offscreen] API error:", message.error);
      notifyBackground("captureError", {
        error: formatApiError(message.error),
      });
      break;

    case "input_audio_buffer.speech_started":
      console.log("[Offscreen] Speech started");
      break;

    case "input_audio_buffer.speech_stopped":
      console.log("[Offscreen] Speech stopped");
      break;

    default:
      // Ignore other message types
      break;
  }
}

function attemptReconnect() {
  state.wsReconnectAttempts++;
  console.log(
    `[Offscreen] Reconnecting (attempt ${state.wsReconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`,
  );
  notifyBackground("statusUpdate", {
    text: "Reconnecting...",
    state: "connecting",
  });

  setTimeout(async () => {
    try {
      await connectWebSocket();
    } catch (err) {
      console.error("[Offscreen] Reconnection failed:", err);
      if (state.wsReconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        notifyBackground("captureError", {
          error: "Failed to reconnect. Please try again.",
        });
        stopCapture();
      }
    }
  }, RECONNECT_DELAY_MS * state.wsReconnectAttempts);
}

// ── Audio Processing ──────────────────────────────────────────────────────────

function startAudioProcessing(stream) {
  console.log("[Offscreen] Starting audio processing...");

  state.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
  state.sourceNode = state.audioContext.createMediaStreamSource(stream);

  // ScriptProcessorNode is deprecated but broadly supported; AudioWorklet needs
  // an additional worker file we'd rather avoid for simplicity.
  state.processorNode = state.audioContext.createScriptProcessor(
    BUFFER_SIZE,
    1,
    1,
  );

  state.processorNode.onaudioprocess = (event) => {
    if (!state.isProcessing) return;
    const inputData = event.inputBuffer.getChannelData(0);
    processAudioChunk(inputData);
  };

  state.sourceNode.connect(state.processorNode);
  state.processorNode.connect(state.audioContext.destination);

  state.isProcessing = true;
  console.log("[Offscreen] ✅ Audio processing started");
}

function processAudioChunk(audioData) {
  const rms = calcRMS(audioData);
  if (rms > SILENCE_THRESHOLD) {
    state.speechDetected = true;
    state.silenceCounter = 0;
  } else {
    state.silenceCounter++;
  }

  // Push into current chunk
  for (let i = 0; i < audioData.length; i++) {
    state.currentChunk.push(audioData[i]);
  }

  if (state.currentChunk.length >= SAMPLES_PER_CHUNK) {
    if (state.speechDetected) {
      sendAudioChunk(state.currentChunk.slice());
    }
    state.currentChunk = [];
    state.speechDetected = false;
  }
}

function sendAudioChunk(audioData) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;

  try {
    const pcm16 = floatTo16BitPCM(audioData);
    const base64Audio = arrayBufferToBase64(pcm16);

    // Append audio to buffer
    state.ws.send(
      JSON.stringify({
        type: "input_audio_buffer.append",
        audio: base64Audio,
      }),
    );

    // Request a response
    state.ws.send(
      JSON.stringify({
        type: "response.create",
        response: {
          modalities: ["text"],
          instructions:
            "Translate this audio to English. Provide only the translation.",
        },
      }),
    );

    console.log("[Offscreen] Audio chunk sent:", base64Audio.length, "chars");
  } catch (err) {
    console.error("[Offscreen] Failed to send audio chunk:", err);
  }
}

// ── Translation Handlers ──────────────────────────────────────────────────────

function handleTranslationDelta(delta) {
  state.currentTranslation += delta;

  const now = Date.now();
  if (now - state.lastTranslationTime > 200) {
    state.lastTranslationTime = now;
    broadcastTranslation(state.currentTranslation);
  }
}

function handleTranslationComplete(translation) {
  console.log("[Offscreen] Translation complete:", translation);
  broadcastTranslation(translation);
  state.currentTranslation = "";
}

function broadcastTranslation(text) {
  if (!state.tabId) return;
  notifyBackground("translationReceived", {
    translation: text,
    tabId: state.tabId,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function notifyBackground(action, payload) {
  chrome.runtime.sendMessage({ action, ...payload }).catch((err) => {
    // Service worker may be inactive briefly; non-fatal
    console.warn("[Offscreen] sendMessage failed:", err?.message);
  });
}

function calcRMS(audioData) {
  let sum = 0;
  for (let i = 0; i < audioData.length; i++) sum += audioData[i] * audioData[i];
  return Math.sqrt(sum / audioData.length);
}

function floatTo16BitPCM(float32Array) {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16.buffer;
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function formatApiError(error) {
  if (!error) return "Unknown API error";
  if (error.code === "invalid_api_key")
    return "Invalid API key. Please check your OpenAI API key.";
  if (error.code === "insufficient_quota")
    return "API quota exceeded. Please check your OpenAI billing.";
  if (error.code === "rate_limit_exceeded")
    return "Rate limit exceeded. Please wait a moment.";
  return error.message || "An error occurred during translation.";
}

console.log("[Offscreen] offscreen.js loaded and ready");
