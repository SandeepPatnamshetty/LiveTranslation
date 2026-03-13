# Architecture Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [Data Flow](#data-flow)
4. [API Integration](#api-integration)
5. [Audio Processing Pipeline](#audio-processing-pipeline)
6. [State Management](#state-management)
7. [Error Handling](#error-handling)
8. [Performance Optimization](#performance-optimization)

---

## System Overview

The Real-Time Video Translator is a Chrome Extension (Manifest V3) that provides real-time audio translation for video content on any website. The system consists of several interconnected components that work together to capture audio, translate it, and display results.

### Key Technologies

- **Chrome Extension APIs**: Manifest V3, tabCapture, storage, scripting
- **Web APIs**: WebSocket, Web Audio API, MediaStream API
- **OpenAI**: GPT-4o Realtime API via WebSocket
- **JavaScript**: ES6+, Async/Await, Promises
- **CSS3**: Flexbox, Grid, Animations, Custom Properties

---

## Component Architecture

### 1. Manifest.json (Extension Configuration)

**Purpose**: Define extension metadata, permissions, and component registration

**Key Configurations**:

- **Permissions**: `tabCapture`, `activeTab`, `storage`, `scripting`
- **Host Permissions**: `<all_urls>` (required for universal video support)
- **Service Worker**: `background.js`
- **Content Scripts**: `content.js`, `styles.css`
- **Web Accessible Resources**: `overlay.js`

### 2. Background Script (background.js)

**Type**: Service Worker (persistent background process)

**Responsibilities**:

- Manage tab audio capture lifecycle
- Coordinate between popup and content scripts
- Store and retrieve API keys from `chrome.storage`
- Maintain active translation sessions
- Handle tab lifecycle events

**Key Classes/Functions**:

```javascript
class TranslationManager {
  - init()                    // Initialize service worker
  - startCapture(tabId)       // Begin audio capture
  - stopCapture(tabId)        // End audio capture
  - handleMessage(request)    // Message router
  - validateApiKey(apiKey)    // Validate OpenAI key
  - getSessionStatus(tabId)   // Get current session state
}
```

**Message Handlers**:

- `startCapture`: Request audio capture for tab
- `stopCapture`: Stop audio capture for tab
- `getTabId`: Return current tab ID
- `getStatus`: Return session status
- `validateApiKey`: Validate OpenAI API key
- `saveSettings`: Persist user settings

### 3. Content Script (content.js)

**Injection**: Automatically injected on all pages (`<all_urls>`)

**Responsibilities**:

- Detect video elements on page load and DOM changes
- Inject translation overlay UI
- Position overlay relative to video bounds
- Handle hover show/hide behavior
- Respond to translation updates
- Manage video lifecycle

**Key Classes/Functions**:

```javascript
class VideoTranslator {
  - init()                        // Initialize translator
  - detectVideos()                // Find all video elements
  - setupVideo(video)             // Setup individual video
  - createOverlay(video)          // Create overlay element
  - positionOverlay(video, overlay) // Position overlay
  - setupHoverBehavior(video, overlayData) // Hover handlers
  - startTranslation(video)       // Start translation
  - stopTranslation(video)        // Stop translation
  - updateTranslation(video, text) // Update overlay text
  - updateStatus(video, text, state) // Update status
  - cleanup()                     // Cleanup resources
}
```

**DOM Observation**:

- Uses `MutationObserver` to detect dynamically added videos
- Debounced detection (300ms) to avoid performance issues
- Handles SPA navigation and lazy-loaded content

### 4. Audio Processor (audio-processor.js)

**Purpose**: Process audio and communicate with OpenAI Realtime API

**Responsibilities**:

- Create and manage AudioContext
- Chunk audio into processable segments
- Encode audio to PCM16 format
- Manage WebSocket connection to OpenAI
- Handle translation responses
- Emit translation events

**Key Classes/Functions**:

```javascript
class AudioProcessor {
  - connect()                     // Connect to OpenAI WebSocket
  - configureSession()            // Configure translation session
  - startProcessing(stream)       // Begin audio processing
  - processAudioChunk(audioData)  // Process audio segment
  - sendAudioChunk(audioData)     // Send to OpenAI
  - handleWebSocketMessage(event) // Handle API responses
  - floatTo16BitPCM(float32Array) // Audio encoding
  - pause()                       // Pause translation
  - resume()                      // Resume translation
  - stop()                        // Stop and cleanup
}
```

**Audio Processing Pipeline**:

1. Capture MediaStream from tab audio
2. Create AudioContext with 16kHz sample rate
3. Process audio in 4096-sample chunks
4. Apply Voice Activity Detection (VAD)
5. Convert to PCM16 format
6. Base64 encode
7. Send via WebSocket

### 5. Popup UI (popup.html + popup.js)

**Purpose**: User interface for settings and control

**Responsibilities**:

- API key management
- Settings configuration
- Translation control (start/stop)
- Status display
- Translation history (planned)

**Key Classes/Functions**:

```javascript
class PopupController {
  - init()                    // Initialize popup
  - loadApiKey()              // Load saved API key
  - loadSettings()            // Load user settings
  - saveApiKey()              // Save API key
  - validateApiKey()          // Validate key with OpenAI
  - saveSettings()            // Save user preferences
  - startTranslation()        // Start translation
  - stopTranslation()         // Stop translation
  - updateStatusBadge(status) // Update status indicator
}
```

**UI Sections**:

- Header with status badge
- API key input and validation
- Display settings (position, font size, opacity)
- Translation control buttons
- Translation history (future)

### 6. Configuration (config.js)

**Purpose**: Centralized configuration constants

**Contains**:

- OpenAI API endpoints and models
- Audio processing parameters
- Overlay UI settings
- Translation settings
- Performance thresholds
- Error messages

---

## Data Flow

### Translation Initialization Flow

```
User clicks "Start Translation"
         ↓
Popup sends message to Background
         ↓
Background requests tabCapture permission
         ↓
Background receives MediaStream
         ↓
Background sends stream to Content Script
         ↓
Content Script initializes AudioProcessor
         ↓
AudioProcessor connects to OpenAI WebSocket
         ↓
AudioProcessor starts processing stream
         ↓
Content Script shows "Listening" status
```

### Audio Translation Flow

```
Video plays audio
         ↓
Tab audio captured by Background
         ↓
AudioProcessor receives stream
         ↓
Audio chunked (2.5s segments)
         ↓
VAD filters silence
         ↓
Audio converted to PCM16
         ↓
Base64 encoded
         ↓
Sent via WebSocket to OpenAI
         ↓
OpenAI processes and translates
         ↓
Translation received as delta/complete
         ↓
Event emitted to Content Script
         ↓
Overlay text updated
         ↓
User sees translation
```

### Message Passing Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Popup     │◄───────►│  Background │◄───────►│   Content   │
│  (UI)       │         │  (Coordinator)│        │  (Overlay)  │
└─────────────┘         └─────────────┘         └─────────────┘
      │                       │                        │
      │ chrome.runtime        │ chrome.tabs           │
      │ .sendMessage()        │ .sendMessage()        │
      │                       │                        │
      ▼                       ▼                        ▼
  Settings                Audio Capture          Translation
  Control                 Management             Display
```

---

## API Integration

### OpenAI Realtime API

**WebSocket Endpoint**:

```
wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17
```

**Authentication**:

- Method: Custom `auth` message with API key
- Alternative: Bearer token (not supported in browser WebSocket constructor)

**Session Configuration**:

```json
{
  "type": "session.update",
  "session": {
    "modalities": ["text", "audio"],
    "instructions": "Translate spoken audio to English",
    "voice": "alloy",
    "input_audio_format": "pcm16",
    "output_audio_format": "pcm16",
    "turn_detection": null
  }
}
```

**Message Types**:

**Outgoing**:

- `session.update`: Configure session
- `conversation.item.create`: Create conversation item
- `input_audio_buffer.append`: Add audio data
- `response.create`: Request translation

**Incoming**:

- `session.created`: Session initialized
- `session.updated`: Session configuration updated
- `response.audio_transcript.delta`: Streaming translation
- `response.audio_transcript.done`: Complete translation
- `response.text.delta`: Text response chunk
- `response.text.done`: Complete text response
- `error`: Error occurred

**Audio Format Requirements**:

- Format: PCM16 (16-bit signed integer)
- Sample Rate: 16kHz
- Channels: 1 (mono)
- Encoding: Base64

---

## Audio Processing Pipeline

### 1. Audio Capture

**Chrome tabCapture API**:

```javascript
chrome.tabCapture.capture(
  {
    audio: true,
    video: false,
  },
  (stream) => {
    // MediaStream obtained
  },
);
```

**Constraints**:

- Requires user gesture to activate
- Only one capture per tab at a time
- Automatically stops when tab closes

### 2. Audio Context Setup

```javascript
const audioContext = new AudioContext({
  sampleRate: 16000, // Required by OpenAI
});

const source = audioContext.createMediaStreamSource(stream);
const processor = audioContext.createScriptProcessor(4096, 1, 1);

source.connect(processor);
processor.connect(audioContext.destination);
```

### 3. Voice Activity Detection (VAD)

**Purpose**: Filter out silence to reduce API costs

**Method**: Calculate RMS (Root Mean Square)

```javascript
function calculateRMS(audioData) {
  let sum = 0;
  for (let i = 0; i < audioData.length; i++) {
    sum += audioData[i] * audioData[i];
  }
  return Math.sqrt(sum / audioData.length);
}

const hasSpeech = rms > 0.01; // Threshold
```

### 4. Audio Chunking

**Parameters**:

- Chunk Duration: 2.5 seconds
- Samples per Chunk: 16000 \* 2.5 = 40,000 samples
- Buffer Size: 4096 samples (ScriptProcessorNode)

**Process**:

1. Accumulate samples until chunk size reached
2. Apply VAD to entire chunk
3. Only send chunks with detected speech
4. Reset accumulator

### 5. Format Conversion

**Float32 to PCM16**:

```javascript
function floatTo16BitPCM(float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array.buffer;
}
```

### 6. Base64 Encoding

```javascript
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
```

---

## State Management

### Storage Architecture

**chrome.storage.sync** (synced across devices):

- `openai_api_key`: Encrypted API key
- `translator_settings`: User preferences
- `is_translation_active`: Current state

**chrome.storage.local** (device-specific):

- `translation_history`: Recent translations

### State Flow

```
User Action
    ↓
UI Update
    ↓
chrome.storage.sync.set()
    ↓
Background receives storage change
    ↓
Broadcast to all content scripts
    ↓
Content scripts update UI
```

### Session Management

**Active Session Data**:

```javascript
{
  tabId: number,
  streamId: string,
  mediaStream: MediaStream,
  isActive: boolean,
  startTime: number,
  audioProcessor: AudioProcessor
}
```

**Stored in**: `TranslationManager.activeSessions` (Map)

---

## Error Handling

### Error Types and Handling

**1. API Key Errors**:

- Missing key → Show setup instructions
- Invalid format → Validate format before saving
- Invalid key → Test with OpenAI models endpoint
- Quota exceeded → Display billing link

**2. Network Errors**:

- WebSocket disconnect → Auto-reconnect (3 attempts)
- HTTP errors → Exponential backoff retry
- Timeout → Increase timeout threshold

**3. Audio Capture Errors**:

- Permission denied → Request permission
- No audio detected → Show "waiting for audio" message
- DRM content → Gracefully handle and notify user
- Tab closed → Cleanup session

**4. Processing Errors**:

- AudioContext error → Recreate context
- Encoding error → Log and skip chunk
- Memory error → Clear buffers and restart

### Error Recovery Strategies

**Graceful Degradation**:

```javascript
try {
  await startTranslation();
} catch (error) {
  console.error("Translation failed:", error);
  showFallbackUI();
  logErrorToAnalytics(error); // Optional
}
```

**Auto-Retry with Backoff**:

```javascript
async function retryWithBackoff(fn, maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxAttempts - 1) throw error;
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}
```

---

## Performance Optimization

### 1. Lazy Loading

- Content script only activates on pages with videos
- AudioProcessor only loaded when translation starts
- Overlay elements created on-demand

### 2. Debouncing & Throttling

- Video detection debounced (300ms)
- Overlay positioning throttled (150ms)
- Translation updates throttled (200ms)

### 3. Memory Management

- Clear audio buffers after processing
- Limit translation history to 50 items
- Use WeakMap for video-to-overlay mapping
- Cleanup on tab close/navigation

### 4. CPU Optimization

- VAD to avoid processing silence
- Efficient Float32 to PCM16 conversion
- Batch DOM updates
- Use requestAnimationFrame for animations

### 5. Network Optimization

- Send only speech segments (VAD)
- WebSocket for bidirectional streaming
- Compression for large payloads (future)

### Performance Targets

| Metric              | Target | Actual  |
| ------------------- | ------ | ------- |
| Translation Latency | < 2s   | 1-2s    |
| CPU Usage (Active)  | < 5%   | 3-5%    |
| CPU Usage (Idle)    | < 1%   | < 1%    |
| Memory (Active)     | < 50MB | 30-45MB |
| Memory (Idle)       | < 10MB | 5-8MB   |

---

## Security Considerations

### 1. API Key Storage

- Stored in `chrome.storage.sync` (encrypted by Chrome)
- Never logged to console
- Validated before use
- User can clear anytime

### 2. Content Security Policy

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### 3. Permissions

- Request minimum necessary permissions
- Explain permission usage to users
- Runtime permission requests for sensitive APIs

### 4. Data Privacy

- No audio stored locally
- Translations not persisted (unless exported)
- No telemetry without consent
- Respect Do Not Track

---

## Testing Strategy

### Unit Tests

- Audio encoding functions
- WebSocket message handling
- Overlay positioning logic
- Error handling paths

### Integration Tests

- End-to-end translation flow
- Multi-video scenarios
- permission flows
- Settings persistence

### Cross-Site Testing

- YouTube (iframe player)
- Vimeo (custom player)
- HTML5 video tag
- Shadow DOM videos

### Performance Testing

- Memory leak detection
- CPU profiling
- Network bandwidth usage
- Latency measurement

---

## Future Enhancements

### Phase 2

- Multiple target languages
- Downloadable subtitles (SRT/VTT)
- Keyboard shortcuts
- Translation caching

### Phase 3

- Offline mode (Whisper + NLLB)
- Voice output (TTS)
- Custom dictionaries
- Better DRM handling

---

## References

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Chrome tabCapture API](https://developer.chrome.com/docs/extensions/reference/tabCapture/)

---

**Last Updated**: March 2026  
**Version**: 1.0.0
