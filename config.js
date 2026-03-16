// Configuration for Real-Time Video Translator Extension

const CONFIG = {
  // OpenAI Realtime API Configuration
  OPENAI: {
    WEBSOCKET_URL: "wss://api.openai.com/v1/realtime",
    MODEL: "gpt-4o-realtime-preview-2024-12-17",
    MODEL_MINI: "gpt-4o-mini-realtime-preview-2024-12-17",
    FALLBACK_REST_URL: "https://api.openai.com/v1/audio/transcriptions",
  },

  // Audio Processing Settings
  AUDIO: {
    SAMPLE_RATE: 16000, // 16kHz required by OpenAI
    CHANNELS: 1, // Mono
    CHUNK_SIZE: 4096,
    CHUNK_DURATION_MS: 2500, // 2.5 seconds per chunk
    BUFFER_SIZE: 5000, // 5 seconds rolling buffer
    SILENCE_THRESHOLD: 0.01, // Voice Activity Detection threshold
    FORMAT: "pcm16",
  },

  // Overlay UI Settings
  OVERLAY: {
    HOVER_AREA_PERCENT: 20, // Bottom 20% of video
    HIDE_DELAY_MS: 2000, // 2 second grace period before hiding
    FADE_IN_MS: 200,
    FADE_OUT_MS: 300,
    MAX_WIDTH_PERCENT: 80,
    BOTTOM_MARGIN_PX: 20,
    POSITIONS: {
      BOTTOM_CENTER: "bottom-center",
      TOP_CENTER: "top-center",
      BOTTOM_LEFT: "bottom-left",
      BOTTOM_RIGHT: "bottom-right",
    },
  },

  // Translation Settings
  TRANSLATION: {
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
    WEBSOCKET_TIMEOUT_MS: 60000,
    MAX_LATENCY_MS: 2000,
    INSTRUCTIONS:
      "You are a real-time translator. Translate the spoken audio to English. Provide only the translation, no explanations or preamble. Be concise and accurate.",
  },

  // Performance Settings
  PERFORMANCE: {
    VIDEO_DETECTION_DEBOUNCE_MS: 300,
    RESIZE_DEBOUNCE_MS: 150,
    MAX_TRANSLATION_HISTORY: 50,
    MEMORY_CLEANUP_INTERVAL_MS: 30000,
  },

  // Storage Keys
  STORAGE_KEYS: {
    API_KEY: "",  // Set your OpenAI API key via the extension's Settings popup — never hardcode it here
    SETTINGS: "translator_settings",
    HISTORY: "translation_history",
    IS_ACTIVE: "is_translation_active",
  },

  // Default User Settings
  DEFAULT_SETTINGS: {
    position: "bottom-center",
    fontSize: "medium",
    backgroundOpacity: 75,
    autoStart: false,
    showHistory: false,
    useMinimalModel: false, // Use gpt-4o-mini for cost savings
  },

  // Font Size Mappings
  FONT_SIZES: {
    small: "14px",
    medium: "16px",
    large: "18px",
    xlarge: "20px",
  },

  // Error Messages
  ERRORS: {
    NO_API_KEY: "Please set your OpenAI API key in the extension settings",
    INVALID_API_KEY: "Invalid API key. Please check your OpenAI API key.",
    QUOTA_EXCEEDED: "API quota exceeded. Please check your OpenAI billing.",
    NETWORK_ERROR: "Network error. Please check your connection.",
    NO_AUDIO: "No audio detected. Please ensure the video has audio.",
    CAPTURE_FAILED:
      "Failed to capture audio. This may be DRM-protected content.",
    WEBSOCKET_ERROR: "Connection to translation service failed.",
    TAB_CAPTURE_ERROR: "Failed to capture tab audio. Please try again.",
  },
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = CONFIG;
}
