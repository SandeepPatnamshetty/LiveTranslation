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
      this.detectionRetryCount = 0; // Counter for video detection retries
    }

    /**
     * Initialize the video translator
     */
    async init() {
      const isInIframe = window.self !== window.top;
      console.log(
        `[VideoTranslator] Initializing... (In iframe: ${isInIframe})`,
      );

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
      // Try multiple selectors
      let videos = document.querySelectorAll("video");

      // Also check for HTML5 video with different attributes
      if (videos.length === 0) {
        videos = document.querySelectorAll("video, video[src], video source");
      }

      // Check iframes for videos
      const iframes = document.querySelectorAll("iframe");
      console.log(`[VideoTranslator] Found ${iframes.length} iframe(s)`);

      // Setup new videos
      videos.forEach((video) => {
        if (!this.videos.has(video)) {
          console.log(`[VideoTranslator] 🎬 Found video element:`, video, {
            src: video.src,
            currentSrc: video.currentSrc,
            readyState: video.readyState,
            paused: video.paused,
            width: video.clientWidth,
            height: video.clientHeight,
          });
          this.setupVideo(video);
          // Set as current video if no current video exists
          if (!this.currentVideo) {
            this.currentVideo = video;
            console.log(`[VideoTranslator] ✅ Set current video:`, video);
          }
        }
      });

      // Clean up removed videos
      this.videos.forEach((overlayData, video) => {
        if (!document.contains(video)) {
          this.cleanupVideo(video);
        }
      });

      console.log(
        `[VideoTranslator] Detected ${videos.length} video(s), Total videos tracked: ${this.videos.size}`,
      );

      // If no videos found, retry in 2 seconds (videos might load late)
      if (videos.length === 0 && !this.detectionRetryCount) {
        this.detectionRetryCount = 0;
      }

      if (videos.length === 0 && this.detectionRetryCount < 5) {
        this.detectionRetryCount++;
        console.log(
          `[VideoTranslator] ⏳ No videos found, retrying in 2s (attempt ${this.detectionRetryCount}/5)...`,
        );
        setTimeout(() => this.detectVideos(), 2000);
      }
    }

    /**
     * Setup a single video element with overlay
     * @param {HTMLVideoElement} video - The video element to setup
     */
    setupVideo(video) {
      console.log("[VideoTranslator] 🎬 Setting up video element:", video);

      const overlay = this.createOverlay(video);
      const overlayData = {
        element: overlay,
        video: video,
        isVisible: false,
        currentTranslation: "",
      };

      this.videos.set(video, overlayData);

      console.log("[VideoTranslator] ✅ Video setup complete", {
        videoElement: video,
        overlayElement: overlay,
        videosMapSize: this.videos.size,
      });

      // Position overlay relative to video (simplified for now)
      // this.positionOverlay(video, overlay);

      // Setup ResizeObserver for dynamic positioning (disabled for debugging)
      // const resizeObserver = new ResizeObserver(() => {
      //   this.positionOverlay(video, overlay);
      // });
      // resizeObserver.observe(video);
      // this.resizeObservers.set(video, resizeObserver);

      // Setup hover behavior (disabled for always-visible mode)
      // this.setupHoverBehavior(video, overlayData);

      // Setup video event listeners
      this.setupVideoListeners(video, overlayData);

      console.log("[VideoTranslator] Setup video complete:", video);
    }

    /**
     * Create overlay element for a video
     * @param {HTMLVideoElement} video - The video element
     * @returns {HTMLElement} The overlay element
     */
    createOverlay(video) {
      const isInIframe = window.self !== window.top;
      console.log(
        `[VideoTranslator] 🎨 Creating overlay (In iframe: ${isInIframe}, URL: ${document.location.href})`,
      );

      // For now, always create overlay in current frame (even if iframe)
      // Cross-origin restrictions prevent access to parent window
      let targetDocument = document;
      let targetWindow = window;

      console.log("[VideoTranslator] ✅ Creating overlay in current window");

      const overlay = targetDocument.createElement("div");
      overlay.className = "video-translator-overlay";
      overlay.setAttribute("data-video-id", this.generateVideoId(video));

      // SUPER SIMPLE STYLING - ignore CSS file for now
      overlay.style.cssText = `
        position: fixed !important;
        bottom: 100px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        background: rgba(255, 0, 0, 0.95) !important;
        color: white !important;
        padding: 30px 50px !important;
        font-size: 32px !important;
        font-weight: bold !important;
        z-index: 2147483647 !important;
        border: 5px solid yellow !important;
        border-radius: 15px !important;
        box-shadow: 0 0 30px rgba(255,0,0,0.8) !important;
        display: none;
        min-width: 400px !important;
        text-align: center !important;
      `;

      overlay.innerHTML = `
        <div class="translation-container">
          <div class="translation-text" style="color: white !important; margin: 0 !important;">Translation will appear here...</div>
          <div class="translation-status" style="margin-top: 10px; font-size: 16px; color: yellow;">
            <span class="status-indicator" style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: lime; margin-right: 8px;"></span>
            <span class="status-text">Ready</span>
          </div>
          <button class="toggle-btn" style="margin-top: 20px; padding: 10px 30px; font-size: 18px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Start Translation
          </button>
        </div>
      `;

      // Append to body (not to video parent to avoid z-index issues)
      // Use targetDocument to create overlay in top window if in iframe
      targetDocument.body.appendChild(overlay);

      // Setup button handler
      const toggleBtn = overlay.querySelector(".toggle-btn");
      if (toggleBtn) {
        toggleBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.toggleTranslation(video);
        });
      }

      // Make overlay visible by default so user can click the button
      overlay.style.display = "block";

      console.log("[VideoTranslator] 🎨 Overlay created and appended to body", {
        element: overlay,
        isInDOM: targetDocument.body.contains(overlay),
        computedDisplay: targetWindow.getComputedStyle(overlay).display,
        position: targetWindow.getComputedStyle(overlay).position,
        usingTopWindow: targetDocument !== document,
      });

      // Setup control button handlers (removed for simplicity)
      // this.setupControlButtons(overlay, video);

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

      // FORCE DISPLAY - VERY VISIBLE!
      overlayData.element.style.display = "block";
      overlayData.element.style.opacity = "1";
      overlayData.element.style.visibility = "visible";
      overlayData.element.classList.add("visible", "always-visible");
      overlayData.isVisible = true;

      console.log("[VideoTranslator] ✅✅✅ OVERLAY SHOULD BE VISIBLE NOW!", {
        hasElement: !!overlayData.element,
        isInDOM: document.body.contains(overlayData.element),
        display: overlayData.element.style.display,
        visibility: overlayData.element.style.visibility,
        opacity: overlayData.element.style.opacity,
        zIndex: overlayData.element.style.zIndex,
        bottom: overlayData.element.style.bottom,
        left: overlayData.element.style.left,
        elementHTML: overlayData.element.outerHTML.substring(0, 200),
      });

      // Extra debugging - log position relative to viewport
      const rect = overlayData.element.getBoundingClientRect();
      console.log("[VideoTranslator] 📍 Overlay position on screen:", {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right,
        width: rect.width,
        height: rect.height,
        isInViewport:
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight &&
          rect.right <= window.innerWidth,
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
        // Wait for video detection if no videos found yet
        if (this.videos.size === 0) {
          console.log("[VideoTranslator] ⏳ Waiting for video detection...");
          // Try to detect videos now
          this.detectVideos();

          // Wait up to 10 seconds for video to be detected
          for (let i = 0; i < 20; i++) {
            if (this.videos.size > 0) {
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
          }

          // Get the first video if we found one
          if (this.videos.size > 0) {
            video = Array.from(this.videos.keys())[0];
            this.currentVideo = video;
            console.log(
              "[VideoTranslator] ✅ Video detected, starting translation",
            );
          } else {
            console.error("[VideoTranslator] ❌ No video found after waiting");
            alert(
              "No video detected on this page. Please make sure the video is loaded and try again.",
            );
            return;
          }
        }

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
      if (!overlayData) {
        console.error("[VideoTranslator] ❌ No overlay data found for video");
        alert(
          "Translation overlay not ready. Please reload the page and try again.",
        );
        return;
      }

      console.log(
        "[VideoTranslator] ✅ Overlay data found, proceeding with capture...",
      );

      // Make overlay visible immediately
      this.makeOverlayAlwaysVisible(video);

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
      const toggleBtn = overlayData.element.querySelector(".toggle-btn");

      if (statusText) statusText.textContent = text;
      if (statusIndicator) {
        statusIndicator.className = `status-indicator ${state}`;
      }

      // Update button text based on state
      if (toggleBtn) {
        if (state === "active" || state === "connecting") {
          toggleBtn.textContent = "Stop Translation";
          toggleBtn.style.background = "#f44336"; // Red
        } else {
          toggleBtn.textContent = "Start Translation";
          toggleBtn.style.background = "#4CAF50"; // Green
        }
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
        const isInIframe = window.self !== window.top;
        console.log(
          `[VideoTranslator] 📨 Received message: ${request.action} (in iframe: ${isInIframe})`,
        );

        switch (request.action) {
          case "updateTranslation":
            // Update translation in any frame that has a video
            if (this.currentVideo) {
              console.log(
                `[VideoTranslator] 📝 Updating translation (iframe: ${isInIframe}):`,
                request.translation,
              );
              this.updateTranslation(this.currentVideo, request.translation);
            } else {
              console.log(
                `[VideoTranslator] ⚠️ No video to update translation (iframe: ${isInIframe})`,
              );
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

    // Audio capture is handled entirely in the Offscreen Document (offscreen.js).
    // content.js only displays translations via updateTranslation() / updateStatus().

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
