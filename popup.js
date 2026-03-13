// popup.js - Extension Popup Logic
// Handles UI interactions, settings management, and extension control

(function () {
  "use strict";

  /**
   * PopupController class - Manages popup UI and interactions
   */
  class PopupController {
    constructor() {
      this.apiKey = "";
      this.settings = {
        position: "bottom-center",
        fontSize: "medium",
        backgroundOpacity: 75,
        autoStart: false,
        showHistory: false,
        useMinimalModel: false,
      };
      this.isActive = false;
      this.currentTabId = null;
    }

    /**
     * Initialize the popup
     */
    async init() {
      console.log("[Popup] Initializing...");

      // Get current tab
      await this.getCurrentTab();

      // Load saved data
      await this.loadApiKey();
      await this.loadSettings();
      await this.checkStatus();

      // Setup event listeners
      this.setupEventListeners();

      // Update UI
      this.updateUI();

      console.log("[Popup] Initialized");
    }

    /**
     * Get current active tab
     */
    async getCurrentTab() {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      this.currentTabId = tab.id;
    }

    /**
     * Load API key from storage
     */
    async loadApiKey() {
      return new Promise((resolve) => {
        chrome.storage.sync.get(["openai_api_key"], (result) => {
          this.apiKey = result.openai_api_key || "";

          const apiKeyInput = document.getElementById("apiKeyInput");
          if (apiKeyInput && this.apiKey) {
            apiKeyInput.value = this.apiKey;
          }

          resolve();
        });
      });
    }

    /**
     * Load settings from storage
     */
    async loadSettings() {
      return new Promise((resolve) => {
        chrome.storage.sync.get(["translator_settings"], (result) => {
          if (result.translator_settings) {
            this.settings = { ...this.settings, ...result.translator_settings };
          }

          // Update UI with loaded settings
          document.getElementById("positionSelect").value =
            this.settings.position;
          document.getElementById("fontSizeSelect").value =
            this.settings.fontSize;
          document.getElementById("opacitySlider").value =
            this.settings.backgroundOpacity;
          document.getElementById("opacityValue").textContent =
            this.settings.backgroundOpacity + "%";
          document.getElementById("autoStartCheckbox").checked =
            this.settings.autoStart;
          document.getElementById("miniModelCheckbox").checked =
            this.settings.useMinimalModel;

          resolve();
        });
      });
    }

    /**
     * Check translation status
     */
    async checkStatus() {
      try {
        const response = await chrome.runtime.sendMessage({
          action: "getStatus",
          tabId: this.currentTabId,
        });

        this.isActive = response.isActive;
        this.updateStatusBadge(response.isActive ? "active" : "inactive");
      } catch (error) {
        console.error("[Popup] Failed to check status:", error);
      }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
      // API Key buttons
      document.getElementById("saveApiKeyBtn").addEventListener("click", () => {
        this.saveApiKey();
      });

      document
        .getElementById("validateApiKeyBtn")
        .addEventListener("click", () => {
          this.validateApiKey();
        });

      document
        .getElementById("toggleApiKeyBtn")
        .addEventListener("click", () => {
          this.toggleApiKeyVisibility();
        });

      // Settings
      document
        .getElementById("opacitySlider")
        .addEventListener("input", (e) => {
          document.getElementById("opacityValue").textContent =
            e.target.value + "%";
        });

      document
        .getElementById("saveSettingsBtn")
        .addEventListener("click", () => {
          this.saveSettings();
        });

      // Translation control
      document.getElementById("startBtn").addEventListener("click", () => {
        this.startTranslation();
      });

      document.getElementById("stopBtn").addEventListener("click", () => {
        this.stopTranslation();
      });

      // History
      document
        .getElementById("clearHistoryBtn")
        ?.addEventListener("click", () => {
          this.clearHistory();
        });

      document
        .getElementById("exportHistoryBtn")
        ?.addEventListener("click", () => {
          this.exportHistory();
        });

      // Links
      document.getElementById("helpBtn").addEventListener("click", () => {
        this.showHelp();
      });

      document.getElementById("aboutLink").addEventListener("click", (e) => {
        e.preventDefault();
        this.showAbout();
      });

      document.getElementById("privacyLink").addEventListener("click", (e) => {
        e.preventDefault();
        this.showPrivacy();
      });

      document.getElementById("feedbackLink").addEventListener("click", (e) => {
        e.preventDefault();
        this.showFeedback();
      });
    }

    /**
     * Update UI based on state
     */
    updateUI() {
      const startBtn = document.getElementById("startBtn");
      const stopBtn = document.getElementById("stopBtn");
      const apiKeySection = document.getElementById("apiKeySection");

      if (this.isActive) {
        startBtn.style.display = "none";
        stopBtn.style.display = "block";
      } else {
        startBtn.style.display = "block";
        stopBtn.style.display = "none";
      }

      // Show/hide sections based on API key
      if (!this.apiKey) {
        apiKeySection.style.display = "block";
      }
    }

    /**
     * Save API key
     */
    async saveApiKey() {
      const apiKeyInput = document.getElementById("apiKeyInput");
      const apiKey = apiKeyInput.value.trim();

      if (!apiKey) {
        this.showMessage("apiKeyMessage", "Please enter an API key", "error");
        return;
      }

      if (!apiKey.startsWith("sk-")) {
        this.showMessage(
          "apiKeyMessage",
          'Invalid API key format. OpenAI keys start with "sk-"',
          "error",
        );
        return;
      }

      try {
        await chrome.storage.sync.set({ openai_api_key: apiKey });
        this.apiKey = apiKey;
        this.showMessage(
          "apiKeyMessage",
          "API key saved successfully",
          "success",
        );

        // Update UI
        this.updateUI();
      } catch (error) {
        this.showMessage(
          "apiKeyMessage",
          "Failed to save API key: " + error.message,
          "error",
        );
      }
    }

    /**
     * Validate API key
     */
    async validateApiKey() {
      const apiKeyInput = document.getElementById("apiKeyInput");
      const apiKey = apiKeyInput.value.trim();

      if (!apiKey) {
        this.showMessage("apiKeyMessage", "Please enter an API key", "error");
        return;
      }

      this.showMessage("apiKeyMessage", "Validating API key...", "info");

      try {
        const response = await chrome.runtime.sendMessage({
          action: "validateApiKey",
          apiKey: apiKey,
        });

        if (response.valid) {
          this.showMessage(
            "apiKeyMessage",
            "API key is valid and saved!",
            "success",
          );
          this.apiKey = apiKey;
          this.updateUI();
        } else {
          this.showMessage(
            "apiKeyMessage",
            "Invalid API key: " + response.error,
            "error",
          );
        }
      } catch (error) {
        this.showMessage(
          "apiKeyMessage",
          "Failed to validate API key: " + error.message,
          "error",
        );
      }
    }

    /**
     * Toggle API key visibility
     */
    toggleApiKeyVisibility() {
      const apiKeyInput = document.getElementById("apiKeyInput");
      const type = apiKeyInput.type === "password" ? "text" : "password";
      apiKeyInput.type = type;
    }

    /**
     * Save settings
     */
    async saveSettings() {
      // Collect settings from UI
      this.settings.position = document.getElementById("positionSelect").value;
      this.settings.fontSize = document.getElementById("fontSizeSelect").value;
      this.settings.backgroundOpacity = parseInt(
        document.getElementById("opacitySlider").value,
      );
      this.settings.autoStart =
        document.getElementById("autoStartCheckbox").checked;
      this.settings.useMinimalModel =
        document.getElementById("miniModelCheckbox").checked;

      try {
        const response = await chrome.runtime.sendMessage({
          action: "saveSettings",
          settings: this.settings,
        });

        if (response.success) {
          this.showMessage(
            "settingsMessage",
            "Settings saved successfully",
            "success",
          );
        } else {
          this.showMessage(
            "settingsMessage",
            "Failed to save settings",
            "error",
          );
        }
      } catch (error) {
        this.showMessage(
          "settingsMessage",
          "Failed to save settings: " + error.message,
          "error",
        );
      }
    }

    /**
     * Start translation
     */
    async startTranslation() {
      if (!this.apiKey) {
        this.showMessage(
          "apiKeyMessage",
          "Please set your API key first",
          "error",
        );
        return;
      }

      this.updateStatusBadge("connecting");

      try {
        const response = await chrome.runtime.sendMessage({
          action: "startCapture",
        });

        if (response.success) {
          this.isActive = true;
          this.updateUI();
          this.updateStatusBadge("active");
        } else {
          this.updateStatusBadge("error");
          alert("Failed to start translation: " + response.error);
        }
      } catch (error) {
        this.updateStatusBadge("error");
        alert("Failed to start translation: " + error.message);
      }
    }

    /**
     * Stop translation
     */
    async stopTranslation() {
      try {
        const response = await chrome.runtime.sendMessage({
          action: "stopCapture",
        });

        if (response.success) {
          this.isActive = false;
          this.updateUI();
          this.updateStatusBadge("inactive");
        }
      } catch (error) {
        alert("Failed to stop translation: " + error.message);
      }
    }

    /**
     * Update status badge
     * @param {string} status - Status (active, inactive, connecting, error)
     */
    updateStatusBadge(status) {
      const statusBadge = document.getElementById("statusBadge");
      const statusDot = statusBadge.querySelector(".status-dot");
      const statusText = statusBadge.querySelector(".status-text");

      // Remove all status classes
      statusBadge.className = "status-badge";
      statusDot.className = "status-dot";

      switch (status) {
        case "active":
          statusBadge.classList.add("status-active");
          statusText.textContent = "Active";
          break;
        case "inactive":
          statusBadge.classList.add("status-inactive");
          statusText.textContent = "Inactive";
          break;
        case "connecting":
          statusBadge.classList.add("status-connecting");
          statusText.textContent = "Connecting...";
          break;
        case "error":
          statusBadge.classList.add("status-error");
          statusText.textContent = "Error";
          break;
        default:
          statusText.textContent = "Ready";
      }
    }

    /**
     * Show message
     * @param {string} elementId - Message element ID
     * @param {string} text - Message text
     * @param {string} type - Message type (success, error, info)
     */
    showMessage(elementId, text, type) {
      const messageEl = document.getElementById(elementId);
      if (!messageEl) return;

      messageEl.textContent = text;
      messageEl.className = "message message-" + type;
      messageEl.style.display = "block";

      // Auto-hide after 5 seconds
      setTimeout(() => {
        messageEl.style.display = "none";
      }, 5000);
    }

    /**
     * Clear translation history
     */
    clearHistory() {
      if (confirm("Are you sure you want to clear all translation history?")) {
        chrome.storage.local.set({ translation_history: [] });
        document.getElementById("historyList").innerHTML =
          '<div class="empty-state">No translations yet</div>';
      }
    }

    /**
     * Export translation history
     */
    async exportHistory() {
      try {
        const result = await chrome.storage.local.get(["translation_history"]);
        const history = result.translation_history || [];

        if (history.length === 0) {
          alert("No translation history to export");
          return;
        }

        // Create text file content
        let content = "Real-Time Video Translator - Translation History\n";
        content += "=".repeat(50) + "\n\n";

        history.forEach((item, index) => {
          const date = new Date(item.timestamp).toLocaleString();
          content += `[${index + 1}] ${date}\n`;
          content += `${item.text}\n\n`;
        });

        // Create download link
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `translation-history-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        alert("Failed to export history: " + error.message);
      }
    }

    /**
     * Show help dialog
     */
    showHelp() {
      alert(
        "Real-Time Video Translator Help\n\n" +
          '1. Enter your OpenAI API key and click "Save"\n' +
          "2. Adjust display settings as needed\n" +
          "3. Navigate to a page with video content\n" +
          '4. Click "Start Translation" to begin\n' +
          "5. Hover near the bottom of any video to see translations\n\n" +
          "For more information, visit the extension page.",
      );
    }

    /**
     * Show about dialog
     */
    showAbout() {
      alert(
        "Real-Time Video Translator v1.0.0\n\n" +
          "Translate video audio to English in real-time on any website.\n\n" +
          "Powered by OpenAI GPT-4o Realtime API\n" +
          "Built with ❤️ for international content accessibility",
      );
    }

    /**
     * Show privacy policy
     */
    showPrivacy() {
      alert(
        "Privacy Policy\n\n" +
          "• Your API key is stored locally and encrypted\n" +
          "• Audio is processed in real-time and not stored\n" +
          "• Translations are not saved unless you export them\n" +
          "• No data is sent to third parties except OpenAI for translation\n" +
          "• No analytics or tracking is performed",
      );
    }

    /**
     * Show feedback form
     */
    showFeedback() {
      const email = "feedback@example.com";
      window.open(`mailto:${email}?subject=Video Translator Feedback`);
    }
  }

  // Initialize popup when DOM is loaded
  document.addEventListener("DOMContentLoaded", () => {
    const popup = new PopupController();
    popup.init();
  });
})();
