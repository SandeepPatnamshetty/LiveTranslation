// overlay.js - Additional overlay utilities (web accessible resource)
// This file provides additional overlay functionality that can be injected into pages

(function () {
  "use strict";

  /**
   * Overlay utilities for managing translation display
   * Can be used by content script for advanced overlay features
   */
  window.VideoTranslatorOverlay = {
    /**
     * Create a custom styled overlay element
     * @param {Object} options - Overlay options
     * @returns {HTMLElement} Overlay element
     */
    createCustomOverlay(options = {}) {
      const {
        text = "",
        position = "bottom-center",
        fontSize = "16px",
        backgroundColor = "rgba(0, 0, 0, 0.75)",
        textColor = "#ffffff",
      } = options;

      const overlay = document.createElement("div");
      overlay.className = "video-translator-custom-overlay";

      overlay.style.cssText = `
        position: fixed;
        z-index: 2147483647;
        background: ${backgroundColor};
        color: ${textColor};
        font-size: ${fontSize};
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        pointer-events: auto;
        backdrop-filter: blur(10px);
      `;

      overlay.textContent = text;
      return overlay;
    },

    /**
     * Animate overlay entrance
     * @param {HTMLElement} element - Element to animate
     */
    animateIn(element) {
      element.style.opacity = "0";
      element.style.transform = "translateY(10px)";

      requestAnimationFrame(() => {
        element.style.transition =
          "opacity 0.2s ease-out, transform 0.2s ease-out";
        element.style.opacity = "1";
        element.style.transform = "translateY(0)";
      });
    },

    /**
     * Animate overlay exit
     * @param {HTMLElement} element - Element to animate
     * @param {Function} callback - Callback after animation
     */
    animateOut(element, callback) {
      element.style.transition = "opacity 0.3s ease-in, transform 0.3s ease-in";
      element.style.opacity = "0";
      element.style.transform = "translateY(10px)";

      setTimeout(() => {
        if (callback) callback();
      }, 300);
    },

    /**
     * Update overlay text with smooth transition
     * @param {HTMLElement} element - Overlay element
     * @param {string} newText - New text to display
     */
    updateText(element, newText) {
      const textElement = element.querySelector(".translation-text") || element;

      // Fade out
      textElement.style.opacity = "0";

      setTimeout(() => {
        textElement.textContent = newText;
        // Fade in
        textElement.style.opacity = "1";
      }, 150);
    },

    /**
     * Calculate optimal position for overlay
     * @param {HTMLVideoElement} video - Video element
     * @param {HTMLElement} overlay - Overlay element
     * @param {string} position - Position preference
     * @returns {Object} Position coordinates
     */
    calculatePosition(video, overlay, position = "bottom-center") {
      const videoRect = video.getBoundingClientRect();
      const overlayRect = overlay.getBoundingClientRect();

      const positions = {
        "bottom-center": {
          left: videoRect.left + (videoRect.width - overlayRect.width) / 2,
          bottom: window.innerHeight - videoRect.bottom + 20,
        },
        "top-center": {
          left: videoRect.left + (videoRect.width - overlayRect.width) / 2,
          top: videoRect.top + 20,
        },
        "bottom-left": {
          left: videoRect.left + 20,
          bottom: window.innerHeight - videoRect.bottom + 20,
        },
        "bottom-right": {
          right: window.innerWidth - videoRect.right + 20,
          bottom: window.innerHeight - videoRect.bottom + 20,
        },
      };

      return positions[position] || positions["bottom-center"];
    },

    /**
     * Check if point is within video bounds
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {HTMLVideoElement} video - Video element
     * @returns {boolean} True if within bounds
     */
    isWithinVideoBounds(x, y, video) {
      const rect = video.getBoundingClientRect();
      return (
        x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
      );
    },

    /**
     * Check if mouse is in hover zone (bottom 20% of video)
     * @param {number} y - Y coordinate
     * @param {HTMLVideoElement} video - Video element
     * @returns {boolean} True if in hover zone
     */
    isInHoverZone(y, video) {
      const rect = video.getBoundingClientRect();
      const hoverThreshold = rect.top + rect.height * 0.8;
      return y >= hoverThreshold && y <= rect.bottom;
    },

    /**
     * Format timestamp for translation history
     * @param {number} timestamp - Unix timestamp
     * @returns {string} Formatted time
     */
    formatTimestamp(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    },

    /**
     * Truncate text to max length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    truncateText(text, maxLength = 100) {
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength - 3) + "...";
    },

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    },

    /**
     * Get video playback time
     * @param {HTMLVideoElement} video - Video element
     * @returns {string} Formatted playback time
     */
    getPlaybackTime(video) {
      const currentTime = Math.floor(video.currentTime);
      const duration = Math.floor(video.duration);

      const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
      };

      return `${formatTime(currentTime)} / ${formatTime(duration)}`;
    },

    /**
     * Check if video is fullscreen
     * @param {HTMLVideoElement} video - Video element
     * @returns {boolean} True if fullscreen
     */
    isFullscreen(video) {
      return (
        document.fullscreenElement === video ||
        document.webkitFullscreenElement === video ||
        document.mozFullScreenElement === video ||
        document.msFullscreenElement === video
      );
    },

    /**
     * Add CSS to page
     * @param {string} css - CSS text
     */
    injectCSS(css) {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);
      return style;
    },

    /**
     * Log debug information
     * @param {string} message - Debug message
     * @param {*} data - Additional data
     */
    debug(message, data) {
      if (console && console.log) {
        console.log(`[VideoTranslator Overlay] ${message}`, data || "");
      }
    },
  };

  // Expose utilities globally
  console.log("[Overlay] Video Translator Overlay utilities loaded");
})();
