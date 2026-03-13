// content.js - Content Script for Video Detection and Overlay Management
// Detects video elements, injects translation overlays, and manages UI

(function () {
  "use strict";

  /**
   * Main VideoTranslator class
   * Manages video detection, overlay injection, and translation UI
   */
  class VideoTranslator {
    constructor() {
      this.videos = new Map(); // Map<video element, overlay data>
      this.isActive = false;
      this.observer = null;
      this.settings = null;
      this.currentVideo = null; // Currently focused/active video
      this.resizeObservers = new Map();
      this.hideTimeouts = new Map();
      this.audioProcessor = null; // Audio processor instance
      this.mediaStream = null; // Media stream from tabCapture
    }

    /**
     * Initialize the video translator
     */
    async init() {
      console.log("[VideoTranslator] Initializing...");

      // Load settings from storage
      await this.loadSettings();

      // Detect existing videos
      this.detectVideos();

      // Watch for dynamically added videos (SPAs, lazy loading)
      this.setupMutationObserver();

      // Listen for messages from background script
      this.setupMessageListener();

      // Listen for translation events
      this.setupTranslationListener();

      // Cleanup on page unload
      window.addEventListener("beforeunload", () => this.cleanup());

      console.log("[VideoTranslator] Initialized successfully");
    }

    /**
     * Load user settings from chrome.storage
     */
    async loadSettings() {
      return new Promise((resolve) => {
        chrome.storage.sync.get(
          ["translator_settings", "is_translation_active"],
          (result) => {
            this.settings = result.translator_settings || {
              position: "bottom-center",
              fontSize: "medium",
              backgroundOpacity: 75,
              autoStart: false,
              showHistory: false,
            };
            this.isActive = result.is_translation_active || false;
            resolve();
          },
        );
      });
    }

    /**
     * Setup MutationObserver to detect dynamically added videos
     */
    setupMutationObserver() {
      this.observer = new MutationObserver(
        this.debounce(() => {
          this.detectVideos();
        }, 300),
      );

      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    /**
     * Detect all video elements on the page
     */
    detectVideos() {
      const videos = document.querySelectorAll("video");

      // Setup new videos
      videos.forEach((video) => {
        if (!this.videos.has(video)) {
          this.setupVideo(video);
          // Set as current video if no current video exists
          if (!this.currentVideo) {
            this.currentVideo = video;
          }
        }
      });

      // Clean up removed videos
      this.videos.forEach((overlayData, video) => {
        if (!document.contains(video)) {
          this.cleanupVideo(video);
        }
      });

      console.log(`[VideoTranslator] Detected ${videos.length} video(s)`);
    }

    /**
     * Setup a single video element with overlay
     * @param {HTMLVideoElement} video - The video element to setup
     */
    setupVideo(video) {
      const overlay = this.createOverlay(video);
      const overlayData = {
        element: overlay,
        video: video,
        isVisible: false,
        currentTranslation: "",
      };

      this.videos.set(video, overlayData);

      // Position overlay relative to video
      this.positionOverlay(video, overlay);

      // Setup ResizeObserver for dynamic positioning
      const resizeObserver = new ResizeObserver(() => {
        this.positionOverlay(video, overlay);
      });
      resizeObserver.observe(video);
      this.resizeObservers.set(video, resizeObserver);

      // Setup hover behavior
      this.setupHoverBehavior(video, overlayData);

      // Setup video event listeners
      this.setupVideoListeners(video, overlayData);

      console.log("[VideoTranslator] Setup video:", video);
    }

    /**
     * Create overlay element for a video
     * @param {HTMLVideoElement} video - The video element
     * @returns {HTMLElement} The overlay element
     */
    createOverlay(video) {
      const overlay = document.createElement("div");
      overlay.className = "video-translator-overlay";
      overlay.setAttribute("data-video-id", this.generateVideoId(video));

      overlay.innerHTML = `
        <div class="translation-container">
          <div class="translation-text" style="color: white !important; font-size: 24px !important; font-weight: bold !important; background: rgba(255,0,0,0.9) !important; padding: 20px !important; border-radius: 8px !important;">Translation will appear here</div>
          <div class="translation-status">
            <span class="status-indicator"></span>
            <span class="status-text">Ready</span>
          </div>
        </div>
        <div class="translation-controls">
          <button class="control-btn toggle-btn" title="Toggle Translation">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path fill="currentColor" d="M3 1v6h6V1H3zm2 2h2v2H5V3zm5-2v6h3V5h2V1h-5zm1 2h2v2h-2V3zM2 10v4h2v-2h2v2h2v-4H2zm9 0v2h-2v2h2v-2h4v-2h-4z"/>
            </svg>
          </button>
          <button class="control-btn settings-btn" title="Settings">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path fill="currentColor" d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
              <path fill="currentColor" d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
            </svg>
          </button>
        </div>
      `;

      // Apply user settings
      this.applyOverlaySettings(overlay);

      // Append to body (not to video parent to avoid z-index issues)
      document.body.appendChild(overlay);

      // Setup control button handlers
      this.setupControlButtons(overlay, video);

      return overlay;
    }

    /**
     * Apply user settings to overlay
     * @param {HTMLElement} overlay - The overlay element
     */
    applyOverlaySettings(overlay) {
      const textElement = overlay.querySelector(".translation-text");

      // Font size
      const fontSizeMap = {
        small: "14px",
        medium: "16px",
        large: "18px",
        xlarge: "20px",
      };
      textElement.style.fontSize =
        fontSizeMap[this.settings.fontSize] || "16px";

      // Background opacity
      const opacity = this.settings.backgroundOpacity / 100;
      overlay.style.setProperty("--bg-opacity", opacity.toString());
    }

    /**
     * Setup control buttons in overlay
     * @param {HTMLElement} overlay - The overlay element
     * @param {HTMLVideoElement} video - The video element
     */
    setupControlButtons(overlay, video) {
      const toggleBtn = overlay.querySelector(".toggle-btn");
      const settingsBtn = overlay.querySelector(".settings-btn");

      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleTranslation(video);
      });

      settingsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        chrome.runtime.sendMessage({ action: "openSettings" });
      });
    }

    /**
     * Position overlay relative to video element
     * @param {HTMLVideoElement} video - The video element
     * @param {HTMLElement} overlay - The overlay element
     */
    positionOverlay(video, overlay) {
      const rect = video.getBoundingClientRect();
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft =
        window.pageXOffset || document.documentElement.scrollLeft;

      // Calculate position based on settings
      const position = this.settings.position;
      const maxWidth = rect.width * 0.8;
      const margin = 20;

      overlay.style.position = "fixed";
      overlay.style.maxWidth = `${maxWidth}px`;
      overlay.style.zIndex = "2147483647"; // Maximum z-index

      switch (position) {
        case "bottom-center":
          overlay.style.left = `${rect.left + (rect.width - maxWidth) / 2}px`;
          overlay.style.bottom = `${window.innerHeight - rect.bottom + margin}px`;
          overlay.style.top = "auto";
          break;

        case "top-center":
          overlay.style.left = `${rect.left + (rect.width - maxWidth) / 2}px`;
          overlay.style.top = `${rect.top + margin}px`;
          overlay.style.bottom = "auto";
          break;

        case "bottom-left":
          overlay.style.left = `${rect.left + margin}px`;
          overlay.style.bottom = `${window.innerHeight - rect.bottom + margin}px`;
          overlay.style.top = "auto";
          break;

        case "bottom-right":
          overlay.style.right = `${window.innerWidth - rect.right + margin}px`;
          overlay.style.bottom = `${window.innerHeight - rect.bottom + margin}px`;
          overlay.style.top = "auto";
          overlay.style.left = "auto";
          break;

        default:
          overlay.style.left = `${rect.left + (rect.width - maxWidth) / 2}px`;
          overlay.style.bottom = `${window.innerHeight - rect.bottom + margin}px`;
          overlay.style.top = "auto";
      }

      // Handle off-screen cases
      const overlayRect = overlay.getBoundingClientRect();
      if (overlayRect.left < 0) {
        overlay.style.left = `${margin}px`;
      }
      if (overlayRect.right > window.innerWidth) {
        overlay.style.right = `${margin}px`;
        overlay.style.left = "auto";
      }
    }

    /**
     * Setup hover behavior for video and overlay
     * @param {HTMLVideoElement} video - The video element
     * @param {Object} overlayData - The overlay data object
     */
    setupHoverBehavior(video, overlayData) {
      const { element: overlay } = overlayData;

      // Show overlay on video hover (near bottom 20%)
      video.addEventListener("mousemove", (e) => {
        const rect = video.getBoundingClientRect();
        const relativeY = e.clientY - rect.top;
        const videoHeight = rect.height;
        const hoverThreshold = videoHeight * 0.8; // Bottom 20%

        if (relativeY >= hoverThreshold) {
          this.showOverlay(video);
        }
      });

      video.addEventListener("mouseleave", () => {
        this.scheduleHideOverlay(video);
      });

      // Keep overlay visible when hovering over it
      overlay.addEventListener("mouseenter", () => {
        this.clearHideTimeout(video);
      });

      overlay.addEventListener("mouseleave", () => {
        this.scheduleHideOverlay(video);
      });
    }

    /**
     * Setup video event listeners
     * @param {HTMLVideoElement} video - The video element
     * @param {Object} overlayData - The overlay data object
     */
    setupVideoListeners(video, overlayData) {
      // Handle fullscreen changes
      document.addEventListener("fullscreenchange", () => {
        this.positionOverlay(video, overlayData.element);
      });

      // Handle video play/pause
      video.addEventListener("play", () => {
        if (this.isActive && this.settings.autoStart) {
          this.startTranslation(video);
        }
      });

      video.addEventListener("pause", () => {
        // Optionally pause translation
      });

      // Handle video focus (for multiple videos)
      video.addEventListener("mouseenter", () => {
        this.currentVideo = video;
      });
    }

    /**
     * Show overlay for a video
     * @param {HTMLVideoElement} video - The video element
     */
    showOverlay(video) {
      const overlayData = this.videos.get(video);
      if (!overlayData) {
        console.warn("[VideoTranslator] No overlay data for video");
        return;
      }

      this.clearHideTimeout(video);
      overlayData.element.classList.add("visible");
      overlayData.isVisible = true;
      console.log("[VideoTranslator] Overlay shown");
    }

    /**
     * Make overlay always visible (when translation is active)
     * @param {HTMLVideoElement} video - The video element
     */
    makeOverlayAlwaysVisible(video) {
      const overlayData = this.videos.get(video);
      if (!overlayData) {
        console.error(
          "[VideoTranslator] Cannot make overlay visible - no overlay data for video",
        );
        return;
      }

      overlayData.element.classList.add("visible", "always-visible");
      overlayData.isVisible = true;

      // Force display for debugging
      overlayData.element.style.display = "block";
      overlayData.element.style.opacity = "1";
      overlayData.element.style.visibility = "visible";

      console.log("[VideoTranslator] ✅ Overlay made always visible", {
        hasElement: !!overlayData.element,
        isInDOM: document.body.contains(overlayData.element),
        classes: overlayData.element.className,
        position: overlayData.element.style.position,
      });
    }

    /**
     * Schedule overlay hiding with grace period
     * @param {HTMLVideoElement} video - The video element
     */
    scheduleHideOverlay(video) {
      const timeout = setTimeout(() => {
        this.hideOverlay(video);
      }, 2000); // 2 second grace period

      this.hideTimeouts.set(video, timeout);
    }

    /**
     * Hide overlay for a video
     * @param {HTMLVideoElement} video - The video element
     */
    hideOverlay(video) {
      const overlayData = this.videos.get(video);
      if (!overlayData) return;

      overlayData.element.classList.remove("visible");
      overlayData.isVisible = false;
    }

    /**
     * Clear hide timeout
     * @param {HTMLVideoElement} video - The video element
     */
    clearHideTimeout(video) {
      const timeout = this.hideTimeouts.get(video);
      if (timeout) {
        clearTimeout(timeout);
        this.hideTimeouts.delete(video);
      }
    }

    /**
     * Toggle translation on/off
     * @param {HTMLVideoElement} video - The video element
     */
    async toggleTranslation(video) {
      if (this.isActive) {
        await this.stopTranslation(video);
      } else {
        await this.startTranslation(video);
      }
    }

    /**
     * Start translation for a video
     * @param {HTMLVideoElement} video - The video element
     */
    async startTranslation(video) {
      console.log("[VideoTranslator] Starting translation...");

      const overlayData = this.videos.get(video);
      if (!overlayData) return;

      // Update status
      this.updateStatus(video, "Starting...", "connecting");

      // Request audio capture from background script
      try {
        const response = await chrome.runtime.sendMessage({
          action: "startCapture",
          tabId: await this.getCurrentTabId(),
        });

        if (response.success) {
          this.isActive = true;
          this.currentVideo = video;
          this.updateStatus(video, "Listening...", "active");

          // Save state
          chrome.storage.sync.set({ is_translation_active: true });
        } else {
          this.updateStatus(video, "Error: " + response.error, "error");
        }
      } catch (error) {
        console.error("[VideoTranslator] Failed to start translation:", error);
        this.updateStatus(video, "Failed to start", "error");
      }
    }

    /**
     * Stop translation
     * @param {HTMLVideoElement} video - The video element
     */
    async stopTranslation(video) {
      console.log("[VideoTranslator] Stopping translation...");

      try {
        await chrome.runtime.sendMessage({ action: "stopCapture" });

        this.isActive = false;
        this.updateStatus(video, "Stopped", "inactive");

        // Save state
        chrome.storage.sync.set({ is_translation_active: false });
      } catch (error) {
        console.error("[VideoTranslator] Failed to stop translation:", error);
      }
    }

    /**
     * Update translation status in overlay
     * @param {HTMLVideoElement} video - The video element
     * @param {string} text - Status text
     * @param {string} state - Status state (active, inactive, error, connecting)
     */
    updateStatus(video, text, state) {
      const overlayData = this.videos.get(video);
      if (!overlayData) return;

      const statusText = overlayData.element.querySelector(".status-text");
      const statusIndicator =
        overlayData.element.querySelector(".status-indicator");

      if (statusText) statusText.textContent = text;
      if (statusIndicator) {
        statusIndicator.className = `status-indicator ${state}`;
      }
    }

    /**
     * Update translation text in overlay
     * @param {HTMLVideoElement} video - The video element
     * @param {string} translation - The translation text
     */
    updateTranslation(video, translation) {
      const overlayData = this.videos.get(video);
      if (!overlayData) {
        console.error(
          "[VideoTranslator] Cannot update translation - no overlay data",
        );
        return;
      }

      const textElement =
        overlayData.element.querySelector(".translation-text");
      if (textElement) {
        console.log("[VideoTranslator] 🗣️ Translation update:", translation);

        // Fade out old text
        textElement.style.opacity = "0";

        setTimeout(() => {
          textElement.textContent = translation;
          overlayData.currentTranslation = translation;

          // Fade in new text
          textElement.style.opacity = "1";

          console.log(
            "[VideoTranslator] ✅ Translation displayed:",
            translation,
          );
        }, 150);
      } else {
        console.error("[VideoTranslator] No text element found in overlay");
      }
    }

    /**
     * Setup message listener for background script
     */
    setupMessageListener() {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
          case "initAudioProcessor":
            this.initializeAudioCapture(request.streamId, request.apiKey)
              .then(() => sendResponse({ success: true }))
              .catch((error) =>
                sendResponse({ success: false, error: error.message }),
              );
            break;

          case "stopAudioProcessor":
            this.stopAudioCapture();
            sendResponse({ success: true });
            break;

          case "updateTranslation":
            if (this.currentVideo) {
              this.updateTranslation(this.currentVideo, request.translation);
            }
            sendResponse({ success: true });
            break;

          case "updateStatus":
            if (this.currentVideo) {
              this.updateStatus(this.currentVideo, request.text, request.state);
            }
            sendResponse({ success: true });
            break;

          case "settingsUpdated":
            this.loadSettings().then(() => {
              this.videos.forEach((overlayData, video) => {
                this.applyOverlaySettings(overlayData.element);
                this.positionOverlay(video, overlayData.element);
              });
            });
            sendResponse({ success: true });
            break;
        }

        return true; // Keep channel open for async response
      });
    }

    /**
     * Setup translation event listener
     */
    setupTranslationListener() {
      window.addEventListener("translation", (event) => {
        if (this.currentVideo && event.detail) {
          this.updateTranslation(this.currentVideo, event.detail);
        }
      });
    }

    /**
     * Get current tab ID
     * @returns {Promise<number>} The tab ID
     */
    async getCurrentTabId() {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "getTabId" }, (response) => {
          resolve(response.tabId);
        });
      });
    }

    /**
     * Generate unique ID for video element
     * @param {HTMLVideoElement} video - The video element
     * @returns {string} Unique ID
     */
    generateVideoId(video) {
      return `video-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Initialize audio capture with stream ID from tabCapture
     * @param {string} streamId - The stream ID from chrome.tabCapture.getMediaStreamId()
     * @param {string} apiKey - OpenAI API key
     */
    async initializeAudioCapture(streamId, apiKey) {
      console.log(
        "[VideoTranslator] Initializing audio capture with stream ID:",
        streamId,
      );

      try {
        // Get the media stream using the stream ID from tabCapture
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            mandatory: {
              chromeMediaSource: "tab",
              chromeMediaSourceId: streamId,
            },
          },
        });

        console.log("[VideoTranslator] Got media stream successfully");

        // Check if AudioProcessor is available (injected by background script)
        if (typeof window.AudioProcessor === "undefined") {
          throw new Error("AudioProcessor not loaded");
        }

        // Create and start audio processor
        this.audioProcessor = new window.AudioProcessor(apiKey, this.settings);

        // Set up callbacks
        this.audioProcessor.onTranslation = (translation) => {
          if (this.currentVideo) {
            this.updateTranslation(this.currentVideo, translation);
          }
        };

        this.audioProcessor.onError = (error) => {
          console.error("[VideoTranslator] Audio processor error:", error);
          if (this.currentVideo) {
            this.updateStatus(this.currentVideo, "Error: " + error, "error");
          }
        };

        this.audioProcessor.onStatusChange = (text, state) => {
          if (this.currentVideo) {
            this.updateStatus(this.currentVideo, text, state);
          }
        };

        // Connect to OpenAI and start processing
        await this.audioProcessor.connect();
        await this.audioProcessor.startProcessing(stream);

        this.isActive = true;
        this.mediaStream = stream;

        // Make overlay always visible when translation is active
        if (this.currentVideo) {
          console.log(
            "[VideoTranslator] Current video found, making overlay visible",
          );
          this.makeOverlayAlwaysVisible(this.currentVideo);
        } else {
          console.error("[VideoTranslator] ❌ No current video set!");
        }

        console.log("[VideoTranslator] Audio capture initialized successfully");
      } catch (error) {
        console.error(
          "[VideoTranslator] Failed to initialize audio capture:",
          error,
        );
        if (this.currentVideo) {
          this.updateStatus(
            this.currentVideo,
            "Failed to start: " + error.message,
            "error",
          );
        }
        throw error;
      }
    }

    /**
     * Stop audio capture and cleanup
     */
    stopAudioCapture() {
      console.log("[VideoTranslator] Stopping audio capture");

      if (this.audioProcessor) {
        this.audioProcessor.stop();
        this.audioProcessor = null;
      }

      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
      }

      this.isActive = false;

      // Hide overlay when translation stops
      if (this.currentVideo) {
        const overlayData = this.videos.get(this.currentVideo);
        if (overlayData) {
          overlayData.element.classList.remove("visible", "always-visible");
        }
        this.updateStatus(this.currentVideo, "Stopped", "inactive");
      }

      console.log("[VideoTranslator] Audio capture stopped");
    }

    /**
     * Cleanup video and its overlay
     * @param {HTMLVideoElement} video - The video element
     */
    cleanupVideo(video) {
      const overlayData = this.videos.get(video);
      if (!overlayData) return;

      // Remove overlay from DOM
      if (overlayData.element && overlayData.element.parentNode) {
        overlayData.element.parentNode.removeChild(overlayData.element);
      }

      // Disconnect ResizeObserver
      const resizeObserver = this.resizeObservers.get(video);
      if (resizeObserver) {
        resizeObserver.disconnect();
        this.resizeObservers.delete(video);
      }

      // Clear timeout
      this.clearHideTimeout(video);

      // Remove from map
      this.videos.delete(video);

      console.log("[VideoTranslator] Cleaned up video");
    }

    /**
     * Cleanup all resources
     */
    cleanup() {
      console.log("[VideoTranslator] Cleaning up...");

      // Stop translation if active
      if (this.isActive && this.currentVideo) {
        this.stopTranslation(this.currentVideo);
      }

      // Cleanup all videos
      this.videos.forEach((overlayData, video) => {
        this.cleanupVideo(video);
      });

      // Disconnect MutationObserver
      if (this.observer) {
        this.observer.disconnect();
      }
    }

    /**
     * Debounce utility function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }
  }

  // Initialize the video translator
  const translator = new VideoTranslator();
  translator.init();
})();
