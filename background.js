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
      console.log(`[Background] Requesting tab capture for tab ${tabId}...`);

      // Ensure the tab is active before requesting capture
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          console.error(
            "[Background] Error getting tab:",
            chrome.runtime.lastError,
          );
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!tab.active) {
          console.warn(
            `[Background] ⚠️ Tab ${tabId} is not active, capture may fail`,
          );
        }

        console.log(`[Background] Tab status:`, {
          id: tab.id,
          active: tab.active,
          url: tab.url,
          audible: tab.audible,
        });

        // Use getMediaStreamId for Manifest V3 compatibility
        console.log(
          `[Background] Calling chrome.tabCapture.getMediaStreamId for tab ${tabId}...`,
        );

        chrome.tabCapture.getMediaStreamId(
          {
            targetTabId: tabId,
          },
          (streamId) => {
            if (chrome.runtime.lastError) {
              console.error(
                "[Background] ❌ Tab capture error:",
                chrome.runtime.lastError.message,
                "\nFull error:",
                chrome.runtime.lastError,
              );
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            if (!streamId) {
              console.error(
                "[Background] ❌ No stream ID returned from tabCapture",
              );
              reject(new Error("No stream ID returned from tabCapture"));
              return;
            }

            console.log(`[Background] ✅ Got stream ID:`, {
              streamId: streamId,
              type: typeof streamId,
              length: streamId.length,
              preview: streamId.substring(0, 20) + "...",
            });
            resolve(streamId);
          },
        );
      });
    });
  }

  /**
   * Store stream ID for a tab
   * @param {number} tabId - The tab ID
   * @param {string} streamId - The stream ID
   */
  storeStreamIdForTab(tabId, streamId) {
    const session = this.activeSessions.get(tabId);
    if (session) {
      session.streamId = streamId;
    }
  }

  /**
   * Initialize audio processor in tab context
   * @param {number} tabId - The tab ID
   * @param {string} streamId - The stream ID
   * @param {string} apiKey - OpenAI API key
   */
  async initializeAudioProcessor(tabId, streamId, apiKey) {
    // Audio processor is now pre-loaded as a content script (see manifest.json)
    // This eliminates the 100-500ms script injection delay
    // Tab capture only works from the top-level window due to browser security
    try {
      const startTime = Date.now();
      console.log(
        `[Background] Sending audio processor init message to tab ${tabId} (streamId: ${streamId.substr(0, 10)}...)`,
      );

      // Send initialization message to content script in MAIN FRAME ONLY (frameId: 0)
      // This prevents iframes from trying to capture audio (which fails due to permissions)
      // CRITICAL: Send this IMMEDIATELY to avoid streamId expiration (streamIds expire quickly!)
      chrome.tabs.sendMessage(
        tabId,
        {
          action: "initAudioProcessor",
          apiKey,
          streamId,
          timestamp: Date.now(), // Track when message was sent
        },
        {
          frameId: 0, // Target main frame only, not iframes
        },
      );

      console.log(
        `[Background] Initialization message sent to main frame (total time: ${Date.now() - startTime}ms)`,
      );
    } catch (error) {
      console.error(
        "[Background] Failed to initialize audio processor:",
        error,
      );
      throw error;
    }
  }

  /**
   * Stop a translation session
   * @param {number} tabId - The tab ID
   */
  async stopSession(tabId) {
    const session = this.activeSessions.get(tabId);
    if (!session) return;

    console.log(`[Background] Stopping session for tab ${tabId}`);

    // Notify content script to cleanup (it will stop the stream)
    // Send to main frame only since audio capture is only in main frame
    try {
      await chrome.tabs.sendMessage(
        tabId,
        {
          action: "stopAudioProcessor",
        },
        {
          frameId: 0, // Main frame only
        },
      );
    } catch (error) {
      // Tab may be closed, ignore error
      console.log("[Background] Tab not available for cleanup message");
    }

    // Remove session
    this.activeSessions.delete(tabId);

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
