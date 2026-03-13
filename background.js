// background.js - Service Worker for Chrome Extension
// Manages tab audio capture, coordinates between popup and content scripts

"use strict";

// Import configuration (note: in service worker, we'll inline needed constants)
const STORAGE_KEYS = {
  API_KEY: "openai_api_key",
  SETTINGS: "translator_settings",
  HISTORY: "translation_history",
  IS_ACTIVE: "is_translation_active",
};

/**
 * Background service managing translation sessions
 */
class TranslationManager {
  constructor() {
    this.activeSessions = new Map(); // tabId -> session data
    this.audioProcessor = null;
  }

  /**
   * Initialize the background service
   */
  init() {
    console.log("[Background] Initializing Translation Manager...");

    // Listen for messages from content scripts and popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep channel open for async responses
    });

    // Listen for tab updates (close sessions for closed tabs)
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.stopSession(tabId);
    });

    // Listen for tab activation changes
    chrome.tabs.onActivated.addListener((activeInfo) => {
      // Pause inactive sessions, resume active one
      this.handleTabActivation(activeInfo.tabId);
    });

    // Extension icon click - open popup
    chrome.action.onClicked.addListener(() => {
      chrome.action.openPopup();
    });

    console.log("[Background] Translation Manager initialized");
  }

  /**
   * Handle incoming messages
   * @param {Object} request - The message request
   * @param {Object} sender - The message sender
   * @param {Function} sendResponse - Response callback
   */
  async handleMessage(request, sender, sendResponse) {
    const { action } = request;

    try {
      switch (action) {
        case "startCapture":
          // Get active tab if sender is popup (no tab)
          const captureTabId = sender.tab?.id || (await this.getActiveTabId());
          await this.startCapture(captureTabId, sendResponse);
          break;

        case "stopCapture":
          // Get active tab if sender is popup (no tab)
          const stopTabId = sender.tab?.id || (await this.getActiveTabId());
          await this.stopCapture(stopTabId, sendResponse);
          break;

        case "getTabId":
          const tabId = sender.tab?.id || (await this.getActiveTabId());
          sendResponse({ tabId });
          break;

        case "getStatus":
          const statusTabId =
            request.tabId || sender.tab?.id || (await this.getActiveTabId());
          sendResponse(this.getSessionStatus(statusTabId));
          break;

        case "openSettings":
          chrome.runtime.openOptionsPage();
          sendResponse({ success: true });
          break;

        case "validateApiKey":
          await this.validateApiKey(request.apiKey, sendResponse);
          break;

        case "getApiKey":
          await this.getApiKey(sendResponse);
          break;

        case "saveSettings":
          await this.saveSettings(request.settings, sendResponse);
          break;

        case "broadcastTranslation":
          // Broadcast translation to all frames (including iframes)
          // This allows iframe overlays to receive translations even though audio capture is in main frame
          const broadcastTabId =
            sender.tab?.id || (await this.getActiveTabId());
          console.log(
            `[Background] Broadcasting translation to all frames of tab ${broadcastTabId}`,
          );
          chrome.tabs.sendMessage(broadcastTabId, {
            action: "updateTranslation",
            translation: request.translation,
          });
          sendResponse({ success: true });
          break;

        // ── Messages from Offscreen Document ──────────────────────────────
        case "translationReceived": {
          // offscreen.js sends this when a translation is ready
          const destTabId = request.tabId;
          if (destTabId) {
            console.log(
              `[Background] Relaying translation to all frames of tab ${destTabId}:`,
              request.translation?.slice(0, 60),
            );
            chrome.tabs
              .sendMessage(destTabId, {
                action: "updateTranslation",
                translation: request.translation,
              })
              .catch(() => {});
          }
          sendResponse({ success: true });
          break;
        }

        case "captureStarted":
          sendResponse({ success: true });
          break;

        case "captureError": {
          console.error(
            "[Background] Capture error from offscreen:",
            request.error,
          );
          // Try to notify active tab about the error
          for (const [tid] of this.activeSessions) {
            chrome.tabs
              .sendMessage(tid, {
                action: "updateStatus",
                text: "Error: " + (request.error || "Capture failed"),
                state: "error",
              })
              .catch(() => {});
          }
          sendResponse({ success: true });
          break;
        }

        case "statusUpdate": {
          // Forward status to all active tabs
          for (const [tid] of this.activeSessions) {
            chrome.tabs
              .sendMessage(tid, {
                action: "updateStatus",
                text: request.text,
                state: request.state,
              })
              .catch(() => {});
          }
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ success: false, error: "Unknown action" });
      }
    } catch (error) {
      console.error("[Background] Error handling message:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Start audio capture for a tab
   * @param {number} tabId - The tab ID
   * @param {Function} sendResponse - Response callback
   */
  async startCapture(tabId, sendResponse) {
    console.log(`[Background] Starting capture for tab ${tabId}`);

    try {
      // Check if API key exists
      const apiKey = await this.getStoredApiKey();
      if (!apiKey) {
        sendResponse({
          success: false,
          error: "Please set your OpenAI API key in the extension settings",
        });
        return;
      }

      // Check if session already exists - clean it up first
      if (this.activeSessions.has(tabId)) {
        console.log(
          `[Background] Session already exists for tab ${tabId}, stopping it first...`,
        );
        await this.stopSession(tabId);
        // Wait a moment for cleanup to complete
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Request tab capture permission
      // First, make sure the tab is active to avoid "Error starting tab capture"
      const currentTab = await chrome.tabs.get(tabId);
      if (!currentTab.active) {
        console.log(
          `[Background] ⚠️ Tab ${tabId} not active, activating it now...`,
        );
        await chrome.tabs.update(tabId, { active: true });
        // Wait for tab to become active
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      const streamId = await this.requestTabCapture(tabId);

      if (!streamId) {
        sendResponse({ success: false, error: "Failed to capture tab audio" });
        return;
      }

      console.log(
        `[Background] StreamId obtained, injecting audio processor immediately...`,
      );

      // Create session
      const session = {
        tabId,
        streamId,
        isActive: true,
        startTime: Date.now(),
        audioProcessor: null,
      };

      this.activeSessions.set(tabId, session);

      // Initialize audio processor in the tab context IMMEDIATELY to avoid streamId expiration
      await this.initializeAudioProcessor(tabId, streamId, apiKey);

      sendResponse({ success: true, streamId });

      // Notify content script
      chrome.tabs.sendMessage(tabId, {
        action: "updateStatus",
        text: "Connected",
        state: "active",
      });
    } catch (error) {
      console.error("[Background] Failed to start capture:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Stop audio capture for a tab
   * @param {number} tabId - The tab ID
   * @param {Function} sendResponse - Response callback
   */
  async stopCapture(tabId, sendResponse) {
    console.log(`[Background] Stopping capture for tab ${tabId}`);

    try {
      await this.stopSession(tabId);
      sendResponse({ success: true });
    } catch (error) {
      console.error("[Background] Failed to stop capture:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Request tab capture permission
   * @param {number} tabId - The tab ID
   * @returns {Promise<string>} Stream ID
   */
  async requestTabCapture(tabId) {
    return new Promise((resolve, reject) => {
      console.log(
        `[Background] Requesting tab capture streamId for tab ${tabId}...`,
      );

      chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (streamId) => {
        if (chrome.runtime.lastError) {
          console.error(
            "[Background] ❌ getMediaStreamId error:",
            chrome.runtime.lastError.message,
          );
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!streamId) {
          reject(new Error("No stream ID returned from tabCapture"));
          return;
        }
        console.log(
          `[Background] ✅ Got streamId (length: ${streamId.length})`,
        );
        resolve(streamId);
      });
    });
  }

  storeStreamIdForTab(tabId, streamId) {
    const session = this.activeSessions.get(tabId);
    if (session) {
      session.streamId = streamId;
    }
  }

  /**
   * Create an ephemeral OpenAI Realtime session key.
   * Background service workers can set arbitrary fetch headers, so we do auth here
   * and hand only the short-lived client_secret down to the offscreen document.
   * @param {string} apiKey - OpenAI API key
   * @returns {Promise<string>} Ephemeral client_secret value
   */
  async createEphemeralSessionKey(apiKey) {
    console.log(
      "[Background] Creating ephemeral OpenAI Realtime session key...",
    );

    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "alloy",
          modalities: ["audio", "text"],
          instructions:
            "You are a real-time translator. Translate the spoken audio to English. Provide only the translation, no explanations or preamble. Be concise and accurate.",
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          input_audio_transcription: { model: "whisper-1" },
          turn_detection: null,
          temperature: 0.6,
        }),
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to create ephemeral session: ${response.status} – ${err?.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();
    const ephemeralKey = data?.client_secret?.value;
    if (!ephemeralKey) {
      throw new Error(
        "Ephemeral key missing in /v1/realtime/sessions response",
      );
    }

    console.log("[Background] ✅ Ephemeral session key obtained");
    return ephemeralKey;
  }

  async initializeAudioProcessor(tabId, streamId, apiKey) {
    console.log(
      `[Background] Creating/reusing offscreen document for tab ${tabId}...`,
    );

    // ── Get ephemeral key (background can set headers; offscreen/content cannot) ──
    let ephemeralKey;
    try {
      ephemeralKey = await this.createEphemeralSessionKey(apiKey);
    } catch (err) {
      console.error(
        "[Background] ❌ Failed to create ephemeral key:",
        err.message,
      );
      // Fall back to raw API key so the WebSocket can still attempt auth
      // (works in dev; prod should always use ephemeral tokens)
      ephemeralKey = apiKey;
    }

    // Ensure offscreen document exists
    let hasDoc = false;
    try {
      hasDoc = await chrome.offscreen.hasDocument();
    } catch (e) {
      console.warn("[Background] hasDocument check failed:", e.message);
    }

    if (!hasDoc) {
      await chrome.offscreen.createDocument({
        url: "offscreen.html",
        reasons: ["USER_MEDIA"],
        justification: "Capture tab audio stream for real-time translation",
      });
      console.log("[Background] ✅ Offscreen document created");
    } else {
      console.log("[Background] Offscreen document already exists, reusing");
    }

    // Send streamId and ephemeral key to offscreen document
    const startTime = Date.now();
    chrome.runtime.sendMessage(
      {
        action: "startOffscreenCapture",
        streamId,
        ephemeralKey,
        tabId,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "[Background] ❌ startOffscreenCapture message failed:",
            chrome.runtime.lastError.message,
          );
        } else {
          console.log(
            `[Background] ✅ startOffscreenCapture response (${Date.now() - startTime}ms):`,
            response,
          );
        }
      },
    );
  }

  /**
   * Stop a translation session
   * @param {number} tabId - The tab ID
   */
  async stopSession(tabId) {
    const session = this.activeSessions.get(tabId);
    if (!session) return;

    console.log(`[Background] Stopping session for tab ${tabId}`);

    // Tell offscreen document to stop capturing
    try {
      const hasDoc = await chrome.offscreen.hasDocument().catch(() => false);
      if (hasDoc) {
        await chrome.runtime
          .sendMessage({ action: "stopOffscreenCapture" })
          .catch(() => {});
        await chrome.offscreen.closeDocument().catch(() => {});
        console.log("[Background] Offscreen document closed");
      }
    } catch (error) {
      console.log(
        "[Background] Offscreen cleanup error (non-fatal):",
        error.message,
      );
    }

    // Remove session
    this.activeSessions.delete(tabId);

    // Notify content scripts in the tab
    chrome.tabs
      .sendMessage(tabId, {
        action: "updateStatus",
        text: "Stopped",
        state: "inactive",
      })
      .catch(() => {});

    console.log(`[Background] Session stopped for tab ${tabId}`);
  }

  /**
   * Handle tab activation changes
   * @param {number} activeTabId - The newly active tab ID
   */
  async handleTabActivation(activeTabId) {
    // Pause all sessions except the active one
    this.activeSessions.forEach((session, tabId) => {
      if (tabId !== activeTabId) {
        // Pause this session
        chrome.tabs
          .sendMessage(tabId, {
            action: "pauseTranslation",
          })
          .catch(() => {
            // Ignore errors for inactive tabs
          });
      } else {
        // Resume active session
        chrome.tabs
          .sendMessage(tabId, {
            action: "resumeTranslation",
          })
          .catch(() => {
            // Ignore errors
          });
      }
    });
  }

  /**
   * Get session status
   * @param {number} tabId - The tab ID
   * @returns {Object} Session status
   */
  getSessionStatus(tabId) {
    const session = this.activeSessions.get(tabId);

    if (!session) {
      return {
        isActive: false,
        status: "inactive",
      };
    }

    return {
      isActive: session.isActive,
      status: "active",
      duration: Date.now() - session.startTime,
    };
  }

  /**
   * Get the active tab ID
   * @returns {Promise<number>} The active tab ID
   */
  async getActiveTabId() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
      return tabs[0].id;
    }
    throw new Error("No active tab found");
  }

  /**
   * Get stored API key
   * @returns {Promise<string>} The API key
   */
  async getStoredApiKey() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([STORAGE_KEYS.API_KEY], (result) => {
        resolve(result[STORAGE_KEYS.API_KEY] || "");
      });
    });
  }

  /**
   * Get API key (for popup)
   * @param {Function} sendResponse - Response callback
   */
  async getApiKey(sendResponse) {
    const apiKey = await this.getStoredApiKey();
    sendResponse({ apiKey });
  }

  /**
   * Validate API key with OpenAI
   * @param {string} apiKey - The API key to validate
   * @param {Function} sendResponse - Response callback
   */
  async validateApiKey(apiKey, sendResponse) {
    try {
      // Simple validation: check format
      if (!apiKey || !apiKey.startsWith("sk-")) {
        sendResponse({
          valid: false,
          error: 'Invalid API key format. OpenAI keys start with "sk-"',
        });
        return;
      }

      // Test the API key with a simple request
      const response = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Save the valid API key
        await chrome.storage.sync.set({ [STORAGE_KEYS.API_KEY]: apiKey });
        sendResponse({ valid: true });
      } else {
        const error = await response.json();
        sendResponse({
          valid: false,
          error: error.error?.message || "Invalid API key",
        });
      }
    } catch (error) {
      sendResponse({
        valid: false,
        error: "Failed to validate API key: " + error.message,
      });
    }
  }

  /**
   * Save user settings
   * @param {Object} settings - The settings to save
   * @param {Function} sendResponse - Response callback
   */
  async saveSettings(settings, sendResponse) {
    try {
      await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: settings });

      // Notify all tabs about settings update
      const tabs = await chrome.tabs.query({});
      tabs.forEach((tab) => {
        chrome.tabs
          .sendMessage(tab.id, {
            action: "settingsUpdated",
            settings,
          })
          .catch(() => {
            // Ignore errors for tabs without content script
          });
      });

      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
}

// Initialize the translation manager
const translationManager = new TranslationManager();
translationManager.init();

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log("[Background] Extension startup");
});

chrome.runtime.onInstalled.addListener((details) => {
  console.log("[Background] Extension installed:", details.reason);

  if (details.reason === "install") {
    // First install - open welcome page or setup
    chrome.tabs.create({
      url: chrome.runtime.getURL("popup.html"),
    });
  }
});
