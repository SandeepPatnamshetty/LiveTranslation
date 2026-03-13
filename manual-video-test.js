// MANUAL TEST SCRIPT - Run this in the browser console to find and overlay videos
// This will help diagnose why the extension can't find the video

console.log("=== VIDEO DETECTION TEST ===");

// 1. Find all videos
const videos = document.querySelectorAll("video");
console.log(`✅ Found ${videos.length} video element(s):`, videos);

if (videos.length > 0) {
  const video = videos[0];

  // 2. Log video details
  console.log("📹 First video details:", {
    element: video,
    src: video.src,
    currentSrc: video.currentSrc,
    width: video.clientWidth,
    height: video.clientHeight,
    paused: video.paused,
    readyState: video.readyState,
    parent: video.parentElement,
    isInDOM: document.body.contains(video),
  });

  // 3. Create a test overlay
  const testOverlay = document.createElement("div");
  testOverlay.id = "manual-test-overlay";
  testOverlay.style.cssText = `
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
    display: block !important;
    min-width: 400px !important;
    text-align: center !important;
  `;
  testOverlay.textContent = "🎬 MANUAL TEST OVERLAY - Video Found!";

  // 4. Add to page
  document.body.appendChild(testOverlay);

  console.log("✅ Test overlay created and added to page");
  console.log("📍 Overlay position:", testOverlay.getBoundingClientRect());
  console.log(
    "👀 Can you see a RED BOX with yellow border at the bottom of your screen?",
  );

  // 5. Remove after 5 seconds
  setTimeout(() => {
    testOverlay.remove();
    console.log("🗑️ Test overlay removed");
  }, 10000);
} else {
  console.error("❌ NO VIDEOS FOUND!");
  console.log("Checking for iframes...");

  const iframes = document.querySelectorAll("iframe");
  console.log(`Found ${iframes.length} iframe(s):`, iframes);

  if (iframes.length > 0) {
    console.log(
      "⚠️ Video might be inside an iframe. Extension may need iframe support.",
    );
  }
}

console.log("=== TEST COMPLETE ===");
