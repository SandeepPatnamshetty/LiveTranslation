# Contributing to Real-Time Video Translator

Thank you for your interest in contributing to the Real-Time Video Translator Chrome Extension! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Submitting Changes](#submitting-changes)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive experience for everyone. We expect all contributors to:

- Be respectful and considerate
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

## Getting Started

### Prerequisites

- Google Chrome 88+ or Microsoft Edge (Chromium)
- Basic knowledge of JavaScript (ES6+)
- Understanding of Chrome Extension APIs
- Git for version control

### Setting Up Development Environment

1. **Fork the repository**:

   ```bash
   git clone https://github.com/yourusername/video-translator-extension.git
   cd video-translator-extension
   ```

2. **Create a feature branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Load extension in Chrome**:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project directory

4. **Make your changes**

5. **Test thoroughly** (see [Testing Guidelines](#testing-guidelines))

## Development Workflow

### Branch Naming Convention

- `feature/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `docs/change-description` - Documentation updates
- `refactor/component-name` - Code refactoring
- `test/test-description` - Adding tests

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:

```
feat(audio): add voice activity detection to reduce API costs

- Implemented RMS calculation for audio chunks
- Added silence threshold configuration
- Reduces unnecessary API calls by 40%

Closes #42
```

```
fix(overlay): correct positioning in fullscreen mode

The overlay was incorrectly positioned when video entered fullscreen.
Now uses document.fullscreenElement to detect and adjust positioning.

Fixes #38
```

## Coding Standards

### JavaScript Style Guide

**General Principles**:

- Use ES6+ syntax (arrow functions, async/await, destructuring)
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable and function names
- Add JSDoc comments for functions
- Keep functions small and focused

**Example**:

```javascript
/**
 * Process audio chunk and send to translation API
 * @param {Float32Array} audioData - Audio samples to process
 * @returns {Promise<void>}
 */
async function processAudioChunk(audioData) {
  if (!audioData || audioData.length === 0) {
    console.warn("Empty audio data received");
    return;
  }

  const rms = calculateRMS(audioData);
  if (rms < SILENCE_THRESHOLD) {
    return; // Skip silent chunks
  }

  const pcm16 = floatTo16BitPCM(audioData);
  const base64Audio = arrayBufferToBase64(pcm16);

  await sendToAPI(base64Audio);
}
```

### CSS Style Guide

**Naming Convention**: BEM (Block Element Modifier)

```css
/* Block */
.video-translator-overlay {
}

/* Element */
.video-translator-overlay__text {
}

/* Modifier */
.video-translator-overlay--visible {
}
```

**Organization**:

1. Layout properties (display, position, etc.)
2. Box model (width, height, margin, padding)
3. Typography (font, color, text-align)
4. Visual (background, border, shadow)
5. Misc (cursor, z-index, transitions)

### File Organization

```
video-translator-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker
├── content.js             # Content script
├── audio-processor.js     # Audio processing module
├── popup.html/js          # UI components
├── styles.css             # Content script styles
├── config.js              # Configuration constants
├── docs/                  # Documentation
└── tests/                 # Test files
```

## Testing Guidelines

### Manual Testing Checklist

Before submitting a PR, test on:

**Websites**:

- [ ] YouTube (regular player)
- [ ] YouTube (embedded player)
- [ ] Vimeo
- [ ] HTML5 `<video>` tag
- [ ] Multiple videos on same page
- [ ] Dynamically loaded videos (SPAs)

**Scenarios**:

- [ ] Start/stop translation
- [ ] Fullscreen mode
- [ ] Picture-in-picture
- [ ] Video resize
- [ ] Page navigation
- [ ] Tab switch
- [ ] Settings changes
- [ ] API key validation

**Edge Cases**:

- [ ] No API key set
- [ ] Invalid API key
- [ ] Network disconnection
- [ ] No audio in video
- [ ] Multiple tabs active
- [ ] Extension reload

### Automated Testing

**Run tests** (when available):

```bash
npm test
```

**Code linting**:

```bash
npm run lint
```

### Browser Testing

Test on:

- Chrome (latest stable)
- Chrome (88 - minimum supported)
- Microsoft Edge (latest)

## Submitting Changes

### Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Ensure all tests pass**
4. **Update README.md** with new features/changes
5. **Update ARCHITECTURE.md** for architectural changes
6. **Create a Pull Request** with clear description

### Pull Request Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Tested on YouTube
- [ ] Tested on Vimeo
- [ ] Tested fullscreen mode
- [ ] Tested with multiple videos

## Screenshots (if applicable)

Add screenshots or GIFs demonstrating the change

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

### Review Process

1. **Automated checks** run on PR
2. **Code review** by maintainers
3. **Address feedback** if requested
4. **Approval** and merge

## Reporting Bugs

### Bug Report Template

When reporting bugs, include:

1. **Description**: Clear description of the bug
2. **Steps to Reproduce**:
   - Go to '...'
   - Click on '...'
   - See error
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Screenshots**: If applicable
6. **Environment**:
   - Chrome version
   - Extension version
   - Operating System
   - Website where bug occurred
7. **Console Errors**: Any errors from DevTools console
8. **Additional Context**: Any other relevant information

### Bug Priority Labels

- `critical`: Crashes, data loss, security issues
- `high`: Major features broken
- `medium`: Minor features broken
- `low`: Cosmetic issues, enhancements

## Feature Requests

### Feature Request Template

1. **Feature Description**: What feature do you want?
2. **Problem It Solves**: What problem does this solve?
3. **Proposed Solution**: How should it work?
4. **Alternatives Considered**: Other approaches considered
5. **Additional Context**: Screenshots, mockups, examples

### Feature Development Process

1. **Discussion**: Feature discussed in issue
2. **Approval**: Maintainers approve feature
3. **Design**: Technical design if complex
4. **Implementation**: Development in feature branch
5. **Review**: Code review and testing
6. **Merge**: Merge to main branch

## Development Tips

### Debugging

**Enable verbose logging**:

```javascript
// In config.js
const DEBUG = true;

// Use throughout code
if (DEBUG) {
  console.log("[Debug] Audio chunk processed:", chunk);
}
```

**Chrome DevTools**:

- **Background script**: `chrome://extensions/` → Inspect views → service worker
- **Content script**: Right-click on page → Inspect
- **Popup**: Right-click on extension icon → Inspect popup

### Performance Profiling

**Memory leaks**:

```javascript
// Create heap snapshot before and after
// chrome://extensions/ → service worker → Memory tab
```

**CPU profiling**:

```javascript
// Performance tab in DevTools
// Record while using extension
// Look for long tasks
```

### Common Issues

**WebSocket connection fails**:

- Check API key validity
- Verify network connection
- Check browser console for errors

**Audio not capturing**:

- Ensure tabCapture permission granted
- Check if audio is playing
- Verify AudioContext created successfully

**Overlay not showing**:

- Check z-index conflicts
- Verify video element detected
- Check hover zone calculation

## Communication

### Channels

- **GitHub Issues**: Bug reports, feature requests
- **Pull Requests**: Code review, discussions
- **Email**: support@example.com (for sensitive issues)

### Response Times

- Bug reports: Response within 48 hours
- Feature requests: Review within 1 week
- Pull requests: Review within 3-5 days

## Recognition

Contributors will be:

- Credited in README.md
- Listed in release notes
- Acknowledged in the project

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Real-Time Video Translator! 🎉**

Your contributions help make international content more accessible to everyone.
