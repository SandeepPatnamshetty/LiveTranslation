// Simple test script to verify overlay creation
// Run this in the browser console to test if overlays can be created

console.log("=== OVERLAY TEST START ===");

// Find all videos
const videos = document.querySelectorAll("video");
console.log(`Found ${videos.length} video(s):`, videos);

if (videos.length > 0) {
  const video = videos[0];
  console.log("First video:", video);
  console.log("Video dimensions:", {
    width: video.clientWidth,
    height: video.clientHeight,
    offsetTop: video.offsetTop,
    offsetLeft: video.offsetLeft,
  });

  // Create a super simple test overlay
  const testOverlay = document.createElement("div");
  testOverlay.id = "test-translation-overlay";
  testOverlay.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: red;
    color: white;
    padding: 40px 80px;
    font-size: 48px;
    font-weight: bold;
    z-index: 999999999;
    border: 10px solid yellow;
    box-shadow: 0 0 50px rgba(255,0,0,0.8);
  `;
  testOverlay.textContent = "TEST TRANSLATION OVERLAY";

  document.body.appendChild(testOverlay);

  console.log("Test overlay created:", testOverlay);
  console.log("Is in DOM?", document.body.contains(testOverlay));
  console.log("Computed style:", window.getComputedStyle(testOverlay));

  setTimeout(() => {
    testOverlay.remove();
    console.log("Test overlay removed");
  }, 5000);
} else {
  console.error("No videos found on page!");
}

console.log("=== OVERLAY TEST END ===");
