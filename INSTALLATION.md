# Installation & Setup Guide

Complete guide to installing and configuring the Real-Time Video Translator Chrome Extension.

## Quick Start (5 Minutes)

### Step 1: Install Extension (2 min)

#### Option A: Load from Source (Developer Mode)

1. **Download the extension**:

   ```bash
   git clone https://github.com/yourusername/video-translator-extension.git
   ```

   Or download ZIP from GitHub and extract

2. **Open Chrome Extensions**:
   - Type `chrome://extensions/` in address bar
   - Or: Menu → Extensions → Manage Extensions

3. **Enable Developer Mode**:
   - Toggle "Developer mode" switch (top-right corner)

4. **Load Extension**:
   - Click "Load unpacked" button
   - Select the `LiveTranslation` folder
   - Extension icon appears in toolbar

#### Option B: Chrome Web Store (Coming Soon)

_Extension is currently in development. Chrome Web Store release coming soon._

### Step 2: Get OpenAI API Key (2 min)

1. **Sign up for OpenAI**:
   - Visit [OpenAI Platform](https://platform.openai.com/)
   - Create account or sign in

2. **Generate API Key**:
   - Go to [API Keys](https://platform.openai.com/api-keys)
   - Click "Create new secret key"
   - Give it a name (e.g., "Video Translator")
   - Copy the key (starts with `sk-...`)
   - **Important**: Save it somewhere safe (you won't see it again!)

3. **Add Credits** (if needed):
   - Go to [Billing](https://platform.openai.com/account/billing)
   - Add payment method
   - Purchase credits (minimum $5 recommended)

### Step 3: Configure Extension (1 min)

1. **Click extension icon** in Chrome toolbar

2. **Enter API Key**:
   - Paste your OpenAI API key
   - Click "Validate" to test
   - Click "Save" to store

3. **Configure Settings** (optional):
   - Choose overlay position (bottom-center recommended)
   - Select font size (medium recommended)
   - Adjust background opacity (75% default)
   - Enable auto-start if desired

4. **Click "Save Settings"**

✅ **You're ready to use the extension!**

---

## Detailed Setup Instructions

### Prerequisites

**System Requirements**:

- Operating System: Windows 10+, macOS 10.14+, Linux
- Browser: Google Chrome 88+ or Microsoft Edge (Chromium)
- Internet: Stable broadband connection (required for real-time translation)

**OpenAI Account Requirements**:

- Valid OpenAI account
- API access enabled
- Credit balance for API usage

### Installation Options

#### Method 1: Git Clone (Recommended for Developers)

```bash
# Clone repository
git clone https://github.com/yourusername/video-translator-extension.git

# Navigate to directory
cd video-translator-extension

# Optional: Create icons (if not included)
# See icons/README.md for instructions
```

#### Method 2: Download ZIP

1. Visit [GitHub Repository](https://github.com/yourusername/video-translator-extension)
2. Click "Code" → "Download ZIP"
3. Extract ZIP to a permanent location (don't delete this folder!)
4. Note: Moving the folder later requires reloading the extension

### Extension Icons Setup

**Important**: Extension requires icons to work properly.

1. Navigate to `icons/` folder
2. Add the following files:
   - `icon16.png` (16×16 pixels)
   - `icon48.png` (48×48 pixels)
   - `icon128.png` (128×128 pixels)

3. See [icons/README.md](icons/README.md) for:
   - Icon design guidelines
   - Creation tools
   - Quick templates

**Quick Placeholder Icons**:

```bash
# Using ImageMagick (if installed)
convert -size 128x128 xc:#667eea -pointsize 48 -fill white -gravity center -annotate +0+0 "VT" icons/icon128.png
convert icons/icon128.png -resize 48x48 icons/icon48.png
convert icons/icon128.png -resize 16x16 icons/icon16.png
```

### OpenAI API Setup

#### Creating OpenAI Account

1. **Sign Up**:
   - Go to [OpenAI](https://openai.com/)
   - Click "Sign up"
   - Use email or Google/Microsoft account

2. **Verify Email**:
   - Check your email for verification link
   - Click to verify account

3. **Complete Profile**:
   - Add basic information
   - Accept terms of service

#### API Key Management

1. **Navigate to API Keys**:
   - [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

2. **Create Key**:
   - Click "+ Create new secret key"
   - Name: "Video Translator Extension"
   - Permissions: Default (full access)
   - Click "Create secret key"

3. **Save Key Securely**:

   ```
   ⚠️ IMPORTANT: Copy and save this key immediately!
   You will not be able to see it again.
   ```

   **Recommended Storage Options**:
   - Password manager (1Password, LastPass, Bitwarden)
   - Secure notes app
   - Encrypted file

   **Never**:
   - Share publicly
   - Commit to Git
   - Include in screenshots

#### Billing Setup

1. **Add Payment Method**:
   - Go to [Billing](https://platform.openai.com/account/billing)
   - Click "Add payment method"
   - Enter credit/debit card details

2. **Purchase Credits**:
   - Minimum: $5
   - Recommended: $10-20 for testing
   - Auto-recharge available

3. **Set Usage Limits** (Recommended):
   - Click "Usage limits"
   - Set monthly budget (e.g., $20)
   - Set email alerts at 50%, 75%, 90%

**Cost Estimates**:

- Testing (1 hour): ~$0.50 - $1.00
- Regular use (10 hours/month): ~$5-10
- Heavy use (50 hours/month): ~$25-50

---

## Configuration Guide

### Extension Settings

#### 1. Display Settings

**Overlay Position**:

- `Bottom Center` (default): Best for most videos
- `Top Center`: For videos with bottom controls
- `Bottom Left`: For right-to-left languages
- `Bottom Right`: Alternative positioning

**Font Size**:

- `Small` (14px): More screen space
- `Medium` (16px): Recommended for most
- `Large` (18px): Better readability
- `Extra Large` (20px): Accessibility

**Background Opacity**:

- `50%`: Minimal overlay
- `75%` (default): Balanced visibility
- `100%`: Maximum contrast

#### 2. Translation Settings

**Auto-Start**:

- ✅ Enabled: Starts translating when video plays
- ❌ Disabled (default): Manual start required

**Model Selection**:

- ❌ GPT-4o Realtime: Best quality, higher cost
- ✅ GPT-4o Mini (recommended): Good quality, 60% lower cost

#### 3. Advanced Settings (Future)

Coming soon:

- Target language selection
- Translation history size
- Keyboard shortcuts
- Custom dictionaries

### Keyboard Shortcuts

**Setting Custom Shortcuts**:

1. Go to `chrome://extensions/shortcuts`
2. Find "Real-Time Video Translator"
3. Set shortcuts for:
   - Toggle translation: e.g., `Ctrl+Shift+T`
   - Show/hide overlay: e.g., `Ctrl+Shift+O`

Recommended shortcuts:

```
Toggle Translation:  Ctrl+Shift+T  (Windows/Linux)
                     Cmd+Shift+T   (macOS)

Show Settings:       Ctrl+Shift+S  (Windows/Linux)
                     Cmd+Shift+S   (macOS)
```

---

## First Use Walkthrough

### Testing the Extension

1. **Navigate to YouTube**:

   ```
   https://www.youtube.com/watch?v=jNQXAC9IVRw
   (Example: "Me at the zoo" - first YouTube video)
   ```

2. **Start Extension**:
   - Click extension icon
   - Click "Start Translation"
   - Status should show "Active"

3. **Hover to View**:
   - Move mouse to bottom 20% of video
   - Translation overlay appears
   - Translations update in real-time

4. **Test Features**:
   - Try fullscreen mode (F)
   - Try different video sizes
   - Test pause/resume
   - Change overlay position

### Recommended Test Sites

**Easy Testing** (English content for verification):

- [YouTube](https://youtube.com) - Any video
- [Vimeo](https://vimeo.com) - High-quality videos
- [TED Talks](https://ted.com) - Educational content

**Foreign Language Testing**:

- Spanish: `youtube.com/watch?v=kJQP7kiw5Fk`
- French: `youtube.com/watch?v=C6qxaLxfOD8`
- German: `youtube.com/watch?v=wvQaSLmexWs`
- Japanese: `youtube.com/watch?v=OB1fY0JwdP8`
- Korean: `youtube.com/watch?v=pAnK1y7qjuE`

---

## Troubleshooting

### Common Issues

#### "Please set your API key" Error

**Cause**: No API key configured

**Solution**:

1. Click extension icon
2. Enter OpenAI API key
3. Click "Validate" then "Save"

#### "Invalid API key" Error

**Causes**:

- Key not copied correctly
- Key revoked or expired
- Account suspended

**Solutions**:

1. Verify key starts with `sk-`
2. Check for extra spaces
3. Generate new key from OpenAI dashboard
4. Verify account status

#### "API quota exceeded" Error

**Cause**: OpenAI account out of credits

**Solution**:

1. Go to [OpenAI Billing](https://platform.openai.com/account/billing)
2. Add credits to account
3. Wait 1-2 minutes for sync
4. Restart extension

#### Translation Not Starting

**Checklist**:

- [ ] Extension icon is active (colored, not grayed)
- [ ] API key is saved
- [ ] Video is playing (not paused)
- [ ] Audio is present in video
- [ ] Internet connection is stable
- [ ] Page has been refreshed after install

**Debug Steps**:

1. Open DevTools (F12)
2. Check Console tab for errors
3. Look for messages starting with `[VideoTranslator]`
4. Report errors in GitHub Issues

#### Overlay Not Appearing

**Causes**:

- Not hovering in bottom 20% of video
- Overlay hidden by site CSS
- Extension not active

**Solutions**:

1. Ensure mouse is near bottom of video
2. Check extension status (should be "Active")
3. Try different overlay position in settings
4. Refresh page and restart extension

#### High Latency (>3 seconds)

**Causes**:

- Slow internet connection
- OpenAI API overloaded
- Too much background audio

**Solutions**:

1. Switch to GPT-4o Mini model
2. Check internet speed (needs 5+ Mbps)
3. Close other bandwidth-heavy apps
4. Try different time of day

### Getting Help

**Before Asking for Help**:

1. Check this guide thoroughly
2. Search [GitHub Issues](https://github.com/yourusername/video-translator-extension/issues)
3. Review [ARCHITECTURE.md](ARCHITECTURE.md) for technical details

**Reporting Issues**:

1. Go to [GitHub Issues](https://github.com/yourusername/video-translator-extension/issues)
2. Click "New Issue"
3. Use bug report template
4. Include:
   - Chrome version
   - Extension version
   - Console errors
   - Steps to reproduce
   - Screenshots if helpful

**Support Channels**:

- GitHub Issues: Technical problems
- Email: support@example.com
- Documentation: This guide + README.md

---

## Uninstallation

### Remove Extension

1. **Via Chrome Extensions**:
   - Go to `chrome://extensions/`
   - Find "Real-Time Video Translator"
   - Click "Remove"
   - Confirm removal

2. **Clean Up Data** (optional):
   - Settings are automatically removed
   - API key is deleted from Chrome storage
   - No residual files remain

### Keep API Key

If you plan to reinstall:

1. Export settings before removal
2. Save API key separately
3. Reinstall and restore settings

---

## Updating the Extension

### Manual Updates (Developer Mode)

1. **Pull Latest Changes**:

   ```bash
   cd video-translator-extension
   git pull origin main
   ```

2. **Reload Extension**:
   - Go to `chrome://extensions/`
   - Click reload icon for the extension
   - Or disable/enable the extension

3. **Clear Cache** (if issues):
   - Right-click extension icon
   - Inspect popup
   - Application tab → Clear storage

### Chrome Web Store Updates (Future)

Once on Chrome Web Store:

- Updates install automatically
- Background updates (no interruption)
- Notification for major updates

---

## Security Best Practices

### API Key Security

✅ **Do**:

- Store in the extension only
- Generate separate keys for different apps
- Rotate keys every 3-6 months
- Set usage limits on OpenAI dashboard

❌ **Don't**:

- Share your API key
- Use same key for multiple services
- Store in plaintext files
- Include in screenshots
- Commit to source control

### Privacy Considerations

**What Gets Sent to OpenAI**:

- Audio from videos only (when translation active)
- No webpage content
- No browsing history
- No personal information

**What Stays Local**:

- API key (encrypted by Chrome)
- User settings
- Translation history (optional)

**OpenAI Data Usage**:

- Review [OpenAI Privacy Policy](https://openai.com/policies/privacy-policy)
- Data may be used to improve models
- Can opt-out of training data usage

### Permissions Explained

- `tabCapture`: Capture audio from browser tab
- `activeTab`: Access current tab for video detection
- `storage`: Save API key and settings
- `scripting`: Inject overlay into web pages
- `<all_urls>`: Work on any website with videos

All permissions are necessary for functionality.

---

## Next Steps

After successful installation:

1. **Explore Features**:
   - Try different websites
   - Test various video players
   - Experiment with settings

2. **Read Documentation**:
   - [README.md](README.md) - Overview and features
   - [ARCHITECTURE.md](ARCHITECTURE.md) - Technical details
   - [CONTRIBUTING.md](CONTRIBUTING.md) - Contribute to project

3. **Provide Feedback**:
   - Report bugs on GitHub
   - Suggest features
   - Share your experience

4. **Stay Updated**:
   - Watch GitHub repository
   - Star the project
   - Follow release notes

---

**Enjoy translating videos in real-time! 🌍🎬**

If you encounter any issues, please refer to the Troubleshooting section or create a GitHub issue.
