# ✅ Setup Checklist

Use this checklist to ensure your Real-Time Video Translator extension is properly configured and ready to use.

---

## 🚀 Pre-Installation Checklist

### System Requirements

- [ ] Google Chrome 88+ or Microsoft Edge (Chromium) installed
- [ ] Desktop computer (Windows, macOS, or Linux)
- [ ] Stable internet connection (5+ Mbps recommended)
- [ ] At least 100MB free disk space

### OpenAI Account Setup

- [ ] Created OpenAI account at [platform.openai.com](https://platform.openai.com)
- [ ] Email verified
- [ ] Payment method added to billing
- [ ] Purchased at least $5 in credits
- [ ] Generated API key (starts with `sk-`)
- [ ] API key saved in secure location

---

## 📦 Installation Checklist

### Download Extension

- [ ] Cloned repository or downloaded ZIP
- [ ] Extracted to permanent location (if ZIP)
- [ ] Located the `LiveTranslation` folder

### Create Extension Icons ⚠️ REQUIRED

- [ ] Created or downloaded icon files
- [ ] Added `icon16.png` (16×16 pixels) to `icons/` folder
- [ ] Added `icon48.png` (48×48 pixels) to `icons/` folder
- [ ] Added `icon128.png` (128×128 pixels) to `icons/` folder
- [ ] Verified all icons are PNG format with transparent background

**Quick Icon Check**:

```bash
# Icons must exist at these exact paths:
LiveTranslation/icons/icon16.png   ✓
LiveTranslation/icons/icon48.png   ✓
LiveTranslation/icons/icon128.png  ✓
```

### Load Extension in Chrome

- [ ] Opened Chrome/Edge
- [ ] Navigated to `chrome://extensions/`
- [ ] Enabled "Developer mode" toggle (top-right)
- [ ] Clicked "Load unpacked" button
- [ ] Selected the `LiveTranslation` folder
- [ ] Extension icon appeared in toolbar
- [ ] No error messages shown

---

## ⚙️ Configuration Checklist

### API Key Setup

- [ ] Clicked extension icon in Chrome toolbar
- [ ] Pasted OpenAI API key in input field
- [ ] Clicked "Validate" button
- [ ] Saw "API key is valid" success message
- [ ] Clicked "Save" button
- [ ] API key section turned green/confirmed

**If validation fails**:

- Check key starts with `sk-`
- Verify no extra spaces
- Ensure account has credits
- Try generating a new key

### Extension Settings

- [ ] Selected overlay position (recommended: Bottom Center)
- [ ] Chose font size (recommended: Medium)
- [ ] Adjusted background opacity (recommended: 75%)
- [ ] Decided on auto-start preference
- [ ] Checked "Use GPT-4o Mini" for lower costs ✅ (recommended)
- [ ] Clicked "Save Settings"
- [ ] Saw "Settings saved successfully" message

---

## 🧪 Testing Checklist

### Basic Functionality Test

- [ ] Opened YouTube: [youtube.com](https://youtube.com)
- [ ] Played any video with audio
- [ ] Clicked extension icon
- [ ] Clicked "Start Translation" button
- [ ] Status changed to "Active" with green indicator
- [ ] Hovered mouse near bottom 20% of video
- [ ] Translation overlay appeared
- [ ] Translations updated in real-time
- [ ] Clicked "Stop Translation" button
- [ ] Status changed to "Inactive"

### Advanced Features Test

- [ ] Tested fullscreen mode (press F)
- [ ] Overlay repositioned correctly in fullscreen
- [ ] Tested with multiple videos on same page
- [ ] Each video got its own overlay
- [ ] Tested video resize (theater mode, etc.)
- [ ] Overlay followed video size changes
- [ ] Tested page navigation
- [ ] Extension continued working after navigation

### Cross-Site Testing

- [ ] Tested on YouTube
- [ ] Tested on Vimeo
- [ ] Tested on a site with HTML5 `<video>` tag
- [ ] Tested on educational content site
- [ ] Tested with foreign language video

**Recommended Test Videos**:

```
English (verify): https://www.youtube.com/watch?v=jNQXAC9IVRw
Spanish: https://www.youtube.com/watch?v=kJQP7kiw5Fk
French: https://www.youtube.com/watch?v=C6qxaLxfOD8
```

---

## 🔍 Verification Checklist

### Visual Verification

- [ ] Extension icon visible in toolbar (not grayed out)
- [ ] Popup opens when clicking icon
- [ ] All settings visible in popup
- [ ] Overlay appears on video hover
- [ ] Overlay text is readable
- [ ] Overlay doesn't block important content
- [ ] Animations are smooth (no flickering)

### Functional Verification

- [ ] Translations appear within 2 seconds of speech
- [ ] Translations are accurate/relevant
- [ ] Overlay hides when mouse leaves video
- [ ] Status indicator updates correctly
- [ ] No console errors in DevTools (F12)
- [ ] Memory usage stays under 50MB
- [ ] CPU usage stays under 5% average

### Performance Check

**Open Chrome Task Manager** (`Shift+Esc`):

- [ ] Extension memory: < 50MB
- [ ] No memory leaks (usage stable over time)
- [ ] CPU usage: < 5% when active
- [ ] Videos play smoothly (no stuttering)

---

## 🐛 Troubleshooting Checklist

### If Extension Won't Load

- [ ] Checked for error messages on extensions page
- [ ] Verified all required files present
- [ ] Confirmed icons exist in correct location
- [ ] Tried reloading extension
- [ ] Restarted Chrome
- [ ] Checked Chrome version (must be 88+)

### If Translation Won't Start

- [ ] Verified API key is saved
- [ ] Checked OpenAI account has credits
- [ ] Confirmed internet connection is active
- [ ] Checked video has audio (not muted)
- [ ] Verified video is playing (not paused)
- [ ] Refreshed the page
- [ ] Checked browser console for errors (F12)

### If Overlay Won't Appear

- [ ] Confirmed extension status is "Active"
- [ ] Hovered in bottom 20% of video
- [ ] Checked overlay position setting
- [ ] Verified no CSS conflicts (try different site)
- [ ] Refreshed page and restarted translation
- [ ] Checked DevTools for element (should see `.video-translator-overlay`)

### If Latency is High (>3 seconds)

- [ ] Tested internet speed (needs 5+ Mbps)
- [ ] Enabled "Use GPT-4o Mini" option
- [ ] Checked OpenAI API status: [status.openai.com](https://status.openai.com)
- [ ] Closed other bandwidth-heavy applications
- [ ] Tried different time of day

---

## 💰 Cost Monitoring Checklist

### OpenAI Dashboard

- [ ] Set up usage alerts at 50%, 75%, 90% of limit
- [ ] Set monthly budget limit
- [ ] Checked current usage stats
- [ ] Understood cost per minute:
  - GPT-4o: ~$0.06/min
  - GPT-4o Mini: ~$0.024/min

### Cost Optimization

- [ ] Enabled "Use GPT-4o Mini" for 60% savings
- [ ] Only translating when needed (not leaving always on)
- [ ] Monitoring API usage regularly
- [ ] Set reasonable budget based on usage

**Expected Monthly Costs**:

```
Light use (5 hours):   $2-7
Medium use (20 hours): $7-29
Heavy use (50 hours):  $18-72
```

---

## 🔒 Security Checklist

### API Key Security

- [ ] API key stored only in extension (not saved elsewhere)
- [ ] No API key in screenshots or shared files
- [ ] Not committed to any Git repository
- [ ] Using separate key for this extension (not shared with other apps)
- [ ] Understand how to revoke key if compromised

### Privacy Settings

- [ ] Reviewed OpenAI privacy policy
- [ ] Understand what data is sent to OpenAI (audio only)
- [ ] Know that no browsing history is collected
- [ ] Aware that translations can be exported but not auto-saved

### Browser Permissions

- [ ] Reviewed required permissions
- [ ] Understand why each permission is needed:
  - `tabCapture`: Audio from videos
  - `activeTab`: Detect videos on current page
  - `storage`: Save settings and API key
  - `scripting`: Inject overlay UI
  - `<all_urls>`: Work on any website

---

## 📚 Documentation Review Checklist

### Read Before Using

- [ ] Quick Start Guide ([QUICK_START.md](QUICK_START.md))
- [ ] Installation Guide ([INSTALLATION.md](INSTALLATION.md))
- [ ] Main README ([README.md](README.md))

### Reference When Needed

- [ ] Bookmarked Troubleshooting section
- [ ] Know where to find technical docs ([ARCHITECTURE.md](ARCHITECTURE.md))
- [ ] Located GitHub Issues page for support

---

## 🎯 Final Verification

### Pre-Use Checklist

- [ ] ✅ Extension loaded without errors
- [ ] ✅ Icons created and working
- [ ] ✅ API key validated and saved
- [ ] ✅ Settings configured and saved
- [ ] ✅ Tested on at least one video
- [ ] ✅ Translations appearing correctly
- [ ] ✅ No errors in console
- [ ] ✅ Performance acceptable

### Ready to Use!

If all above items are checked, you're ready to use the Real-Time Video Translator! 🎉

---

## 📞 Getting Help

### If Stuck on Any Step

**Self-Help Resources**:

1. Re-read relevant documentation section
2. Check [Troubleshooting Guide](INSTALLATION.md#troubleshooting)
3. Search [GitHub Issues](https://github.com/yourusername/video-translator-extension/issues)

**Ask for Help**:

1. Create [GitHub Issue](https://github.com/yourusername/video-translator-extension/issues/new)
2. Email: support@example.com
3. Include:
   - Which checklist item is failing
   - Chrome version
   - Error messages (if any)
   - Screenshots (if helpful)

---

## 🎓 Next Steps After Setup

### Learn More

- [ ] Read technical architecture docs
- [ ] Explore advanced settings
- [ ] Set up keyboard shortcuts
- [ ] Bookmark frequently used video sites

### Optimize Usage

- [ ] Find optimal overlay position for your workflow
- [ ] Test different font sizes for readability
- [ ] Adjust opacity based on video content
- [ ] Monitor and optimize API costs

### Get Involved

- [ ] Star the GitHub repository ⭐
- [ ] Share feedback or suggestions
- [ ] Report any bugs found
- [ ] Consider contributing improvements

---

## 📊 Success Metrics

After setup, you should be able to:

- ✅ Start translation in < 5 clicks
- ✅ See translations within 2 seconds
- ✅ Use on any major video site
- ✅ Customize appearance to preference
- ✅ Understand and monitor costs
- ✅ Troubleshoot common issues

---

**Congratulations! Your extension is ready to use! 🎉**

Happy translating! 🌍🎬

---

_Last Updated: March 2026_
_Version: 1.0.0_
