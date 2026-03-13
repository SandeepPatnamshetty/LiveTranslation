// audio-processor.js - Audio Processing and OpenAI Realtime API Integration
// Handles audio capture, chunking, encoding, and WebSocket communication

(function () {
  "use strict";

  /**
   * AudioProcessor class - Manages audio processing and translation
   */
  class AudioProcessor {
    constructor(apiKey, settings = {}) {
      this.apiKey = apiKey;
      this.settings = settings;

      // WebSocket connection
      this.ws = null;
      this.wsReconnectAttempts = 0;
      this.maxReconnectAttempts = 3;
      this.reconnectDelay = 1000;

      // Audio processing
      this.audioContext = null;
      this.mediaStream = null;
      this.sourceNode = null;
      this.processorNode = null;
      this.isProcessing = false;
      this.isPaused = false;

      // Audio buffering
      this.audioBuffer = [];
      this.bufferSize = 4096;
      this.sampleRate = 16000; // Required by OpenAI
      this.chunkDuration = 2500; // 2.5 seconds
      this.samplesPerChunk = (this.sampleRate * this.chunkDuration) / 1000;
      this.currentChunk = [];

      // Voice Activity Detection
      this.silenceThreshold = 0.01;
      this.minSpeechDuration = 500; // ms
      this.speechDetected = false;
      this.silenceCounter = 0;

      // Translation state
      this.currentTranslation = "";
      this.translationQueue = [];
      this.lastTranslationTime = 0;

      // Event callbacks
      this.onTranslation = null;
      this.onError = null;
      this.onStatusChange = null;
    }

    /**
     * Initialize and connect to OpenAI Realtime API
     */
    async connect() {
      console.log("[AudioProcessor] Connecting to OpenAI Realtime API...");

      return new Promise((resolve, reject) => {
        try {
          // Connect to WebSocket
          const wsUrl =
            "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";

          this.ws = new WebSocket(wsUrl, [], {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "OpenAI-Beta": "realtime=v1",
            },
          });

          // Note: WebSocket constructor doesn't support custom headers directly
          // We need to handle authentication differently
          this.ws = new WebSocket(
            `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`,
          );

          this.ws.onopen = () => {
            console.log("[AudioProcessor] WebSocket connected");
            this.wsReconnectAttempts = 0;

            // Send session configuration with API key
            this.configureSession();

            if (this.onStatusChange) {
              this.onStatusChange("Connected", "active");
            }

            resolve();
          };

          this.ws.onmessage = (event) => {
            this.handleWebSocketMessage(event);
          };

          this.ws.onerror = (error) => {
            console.error("[AudioProcessor] WebSocket error:", error);

            if (this.onError) {
              this.onError(
                "Connection error. Please check your internet connection.",
              );
            }

            reject(error);
          };

          this.ws.onclose = (event) => {
            console.log(
              "[AudioProcessor] WebSocket closed:",
              event.code,
              event.reason,
            );

            if (
              this.isProcessing &&
              this.wsReconnectAttempts < this.maxReconnectAttempts
            ) {
              // Attempt to reconnect
              this.attemptReconnect();
            }
          };
        } catch (error) {
          console.error("[AudioProcessor] Failed to create WebSocket:", error);
          reject(error);
        }
      });
    }

    /**
     * Configure OpenAI session for translation
     */
    configureSession() {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      const sessionConfig = {
        type: "session.update",
        session: {
          modalities: ["text", "audio"],
          instructions:
            "You are a real-time translator. Translate the spoken audio to English. Provide only the translation, no explanations or preamble. Be concise and accurate.",
          voice: "alloy",
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          input_audio_transcription: {
            model: "whisper-1",
          },
          turn_detection: null, // Manual turn detection
          temperature: 0.6,
          max_response_output_tokens: 4096,
        },
      };

      // Note: We need to send API key in the session
      // For WebSocket, authentication is typically done via query param or initial message
      // Let's send an auth message first
      this.ws.send(
        JSON.stringify({
          type: "auth",
          api_key: this.apiKey,
        }),
      );

      // Then configure session
      this.ws.send(JSON.stringify(sessionConfig));

      console.log("[AudioProcessor] Session configured");
    }

    /**
     * Attempt to reconnect WebSocket
     */
    async attemptReconnect() {
      this.wsReconnectAttempts++;

      console.log(
        `[AudioProcessor] Reconnecting... (attempt ${this.wsReconnectAttempts}/${this.maxReconnectAttempts})`,
      );

      if (this.onStatusChange) {
        this.onStatusChange("Reconnecting...", "connecting");
      }

      setTimeout(async () => {
        try {
          await this.connect();
        } catch (error) {
          console.error("[AudioProcessor] Reconnection failed:", error);

          if (this.wsReconnectAttempts >= this.maxReconnectAttempts) {
            if (this.onError) {
              this.onError("Failed to reconnect. Please try again.");
            }
            this.stop();
          }
        }
      }, this.reconnectDelay * this.wsReconnectAttempts);
    }

    /**
     * Start processing audio stream
     * @param {MediaStream} stream - The media stream to process
     */
    async startProcessing(stream) {
      console.log("[AudioProcessor] Starting audio processing...");

      this.mediaStream = stream;

      try {
        // Create audio context with required sample rate
        this.audioContext = new (
          window.AudioContext || window.webkitAudioContext
        )({
          sampleRate: this.sampleRate,
        });

        // Create source node from stream
        this.sourceNode = this.audioContext.createMediaStreamSource(stream);

        // Create processor node (ScriptProcessorNode is deprecated but still widely supported)
        // AudioWorklet is preferred but more complex to set up
        this.processorNode = this.audioContext.createScriptProcessor(
          this.bufferSize,
          1, // mono input
          1, // mono output
        );

        // Process audio chunks
        this.processorNode.onaudioprocess = (event) => {
          if (!this.isProcessing || this.isPaused) return;

          const inputData = event.inputBuffer.getChannelData(0);
          this.processAudioChunk(inputData);
        };

        // Connect nodes
        this.sourceNode.connect(this.processorNode);
        this.processorNode.connect(this.audioContext.destination);

        this.isProcessing = true;

        console.log("[AudioProcessor] Audio processing started");

        if (this.onStatusChange) {
          this.onStatusChange("Listening...", "active");
        }
      } catch (error) {
        console.error(
          "[AudioProcessor] Failed to start audio processing:",
          error,
        );

        if (this.onError) {
          this.onError("Failed to process audio: " + error.message);
        }

        throw error;
      }
    }

    /**
     * Process audio chunk
     * @param {Float32Array} audioData - Audio data chunk
     */
    processAudioChunk(audioData) {
      // Voice Activity Detection
      const rms = this.calculateRMS(audioData);
      const hasSpeech = rms > this.silenceThreshold;

      if (hasSpeech) {
        this.speechDetected = true;
        this.silenceCounter = 0;
      } else {
        this.silenceCounter++;
      }

      // Add to current chunk
      this.currentChunk.push(...audioData);

      // Check if we have enough samples for a chunk (2.5 seconds)
      if (this.currentChunk.length >= this.samplesPerChunk) {
        // Only send if speech was detected
        if (this.speechDetected) {
          this.sendAudioChunk(this.currentChunk);
        }

        // Reset chunk
        this.currentChunk = [];
        this.speechDetected = false;
      }
    }

    /**
     * Send audio chunk to OpenAI
     * @param {Array<number>} audioData - Audio samples
     */
    sendAudioChunk(audioData) {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.warn("[AudioProcessor] WebSocket not ready, skipping chunk");
        return;
      }

      try {
        // Convert Float32Array to PCM16
        const pcm16 = this.floatTo16BitPCM(audioData);

        // Encode to base64
        const base64Audio = this.arrayBufferToBase64(pcm16);

        // Create conversation item
        this.ws.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [
                {
                  type: "input_audio",
                  audio: base64Audio,
                },
              ],
            },
          }),
        );

        // Append to input audio buffer (alternative approach)
        this.ws.send(
          JSON.stringify({
            type: "input_audio_buffer.append",
            audio: base64Audio,
          }),
        );

        // Trigger response generation
        this.ws.send(
          JSON.stringify({
            type: "response.create",
            response: {
              modalities: ["text"],
              instructions:
                "Translate this audio to English. Provide only the translation.",
            },
          }),
        );

        console.log(
          "[AudioProcessor] Audio chunk sent:",
          base64Audio.length,
          "bytes",
        );
      } catch (error) {
        console.error("[AudioProcessor] Failed to send audio chunk:", error);
      }
    }

    /**
     * Handle WebSocket messages
     * @param {MessageEvent} event - WebSocket message event
     */
    handleWebSocketMessage(event) {
      try {
        const message = JSON.parse(event.data);

        console.log("[AudioProcessor] Received message:", message.type);

        switch (message.type) {
          case "session.created":
            console.log("[AudioProcessor] Session created");
            break;

          case "session.updated":
            console.log("[AudioProcessor] Session updated");
            break;

          case "response.audio_transcript.delta":
            // Real-time audio transcription
            if (message.delta) {
              this.handleTranslationDelta(message.delta);
            }
            break;

          case "response.audio_transcript.done":
            // Complete transcription
            if (message.transcript) {
              this.handleTranslationComplete(message.transcript);
            }
            break;

          case "response.text.delta":
            // Text response delta
            if (message.delta) {
              this.handleTranslationDelta(message.delta);
            }
            break;

          case "response.text.done":
            // Complete text response
            if (message.text) {
              this.handleTranslationComplete(message.text);
            }
            break;

          case "response.done":
            console.log("[AudioProcessor] Response complete");
            break;

          case "error":
            console.error("[AudioProcessor] API error:", message.error);
            if (this.onError) {
              this.onError(this.formatError(message.error));
            }
            break;

          case "input_audio_buffer.speech_started":
            console.log("[AudioProcessor] Speech started");
            break;

          case "input_audio_buffer.speech_stopped":
            console.log("[AudioProcessor] Speech stopped");
            break;

          default:
            console.log(
              "[AudioProcessor] Unhandled message type:",
              message.type,
            );
        }
      } catch (error) {
        console.error(
          "[AudioProcessor] Failed to parse WebSocket message:",
          error,
        );
      }
    }

    /**
     * Handle translation delta (streaming response)
     * @param {string} delta - Translation text delta
     */
    handleTranslationDelta(delta) {
      this.currentTranslation += delta;

      // Emit translation event (debounced to avoid too many updates)
      const now = Date.now();
      if (now - this.lastTranslationTime > 200) {
        // Update every 200ms max
        if (this.onTranslation) {
          this.onTranslation(this.currentTranslation);
        }

        // Also emit as window event for content script
        window.dispatchEvent(
          new CustomEvent("translation", {
            detail: this.currentTranslation,
          }),
        );

        this.lastTranslationTime = now;
      }
    }

    /**
     * Handle complete translation
     * @param {string} translation - Complete translation text
     */
    handleTranslationComplete(translation) {
      console.log("[AudioProcessor] Translation complete:", translation);

      if (this.onTranslation) {
        this.onTranslation(translation);
      }

      // Emit as window event
      window.dispatchEvent(
        new CustomEvent("translation", {
          detail: translation,
        }),
      );

      // Add to history
      this.translationQueue.push({
        text: translation,
        timestamp: Date.now(),
      });

      // Reset current translation for next chunk
      this.currentTranslation = "";
    }

    /**
     * Format error message
     * @param {Object} error - Error object
     * @returns {string} Formatted error message
     */
    formatError(error) {
      if (error.code === "invalid_api_key") {
        return "Invalid API key. Please check your OpenAI API key.";
      } else if (error.code === "insufficient_quota") {
        return "API quota exceeded. Please check your OpenAI billing.";
      } else if (error.code === "rate_limit_exceeded") {
        return "Rate limit exceeded. Please wait a moment.";
      } else {
        return error.message || "An error occurred during translation.";
      }
    }

    /**
     * Pause translation
     */
    pause() {
      this.isPaused = true;
      console.log("[AudioProcessor] Translation paused");

      if (this.onStatusChange) {
        this.onStatusChange("Paused", "inactive");
      }
    }

    /**
     * Resume translation
     */
    resume() {
      this.isPaused = false;
      console.log("[AudioProcessor] Translation resumed");

      if (this.onStatusChange) {
        this.onStatusChange("Listening...", "active");
      }
    }

    /**
     * Stop processing and cleanup
     */
    stop() {
      console.log("[AudioProcessor] Stopping...");

      this.isProcessing = false;

      // Close WebSocket
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

      // Stop audio context
      if (this.processorNode) {
        this.processorNode.disconnect();
        this.processorNode = null;
      }

      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }

      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }

      // Clear buffers
      this.currentChunk = [];
      this.audioBuffer = [];
      this.currentTranslation = "";

      console.log("[AudioProcessor] Stopped");

      if (this.onStatusChange) {
        this.onStatusChange("Stopped", "inactive");
      }
    }

    /**
     * Calculate RMS (Root Mean Square) for Voice Activity Detection
     * @param {Float32Array} audioData - Audio data
     * @returns {number} RMS value
     */
    calculateRMS(audioData) {
      let sum = 0;
      for (let i = 0; i < audioData.length; i++) {
        sum += audioData[i] * audioData[i];
      }
      return Math.sqrt(sum / audioData.length);
    }

    /**
     * Convert Float32Array to 16-bit PCM
     * @param {Array<number>} float32Array - Audio samples as floats
     * @returns {ArrayBuffer} PCM16 data
     */
    floatTo16BitPCM(float32Array) {
      const int16Array = new Int16Array(float32Array.length);

      for (let i = 0; i < float32Array.length; i++) {
        // Clamp to [-1, 1]
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        // Convert to 16-bit integer
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      return int16Array.buffer;
    }

    /**
     * Convert ArrayBuffer to base64
     * @param {ArrayBuffer} buffer - Buffer to convert
     * @returns {string} Base64 encoded string
     */
    arrayBufferToBase64(buffer) {
      let binary = "";
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;

      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }

      return btoa(binary);
    }
  }

  // Make AudioProcessor available globally for use by content script
  window.AudioProcessor = AudioProcessor;

  // Listen for initialization message from background script
  if (typeof chrome !== "undefined" && chrome.runtime) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "initAudioProcessor") {
        console.log("[AudioProcessor] Initializing with API key");

        // This would be called from content script with proper stream
        sendResponse({ success: true });
      }

      return true;
    });
  }
})();
