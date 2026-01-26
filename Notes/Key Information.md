# Key Concepts & Constraints

## KEY CONCEPTS (The Pillars)
**1. REHABILITATION FIRST**
* The primary goal is stroke recovery.
* Users are likely elderly, low-vision, or cognitively fatigued.
* "Success" is defined by patient confidence, not just app performance.

**2. ESP32 WEBSERVER HOSTING**
* The entire website is served directly from an ESP32 microcontroller.
* Storage is likely an SD Card or LittleFS.
* **Constraint:** Bandwidth is limited; asset sizes must be tiny to ensure fast loading.

**3. GYROSCOPIC INPUT (MPU-9250)**
* The "Mouse" is a physical handheld device with an IMU sensor.
* **Communication:** Real-time UDP/WebSocket (`ws://`) stream of X/Y/Z data.
* **Constraint:** Sensor noise and drift are unavoidable; software stabilization is mandatory.

**4. EXOSKELETON CONSTRAINT**
* Users are strapped into a mechanical arm assist.
* Movement causes physical tremors and fatigue.
* Range of Motion (ROM) is often physically limited/restricted.

**5. TELEVISION DISPLAY**
* The UI is viewed from 5-10 feet away.
* Standard "Web Design" (12px fonts, small buttons) will fail.
* **Design Pattern:** Kiosk / Console UI (Huge text, high contrast, overscan-safe).

---

## THINGS TO TAKE NOTE (The Constraints)

**1. AUDIO STRATEGY**
* **NO SYNTHESIS:** It feels "finicky" or cheap.
* **PREFERENCE:** Small, high-quality audio assets (MP3/WAV) served from SD Card.
* **REQUIREMENT:** Must use aggressive Caching (Service Worker or Cache API) so audio plays instantly without network lag from the ESP32.

**2. ASSET OPTIMIZATION**
* Images must be SVGs where possible (scale infinitely on TV, small file size).
* Bitmap images (PNG/JPG) must be compressed to avoid stalling the ESP32 webserver.

**3. INPUT LATENCY**
* The loop from `[Gyro Move] -> [ESP32 Processing] -> [WebSocket] -> [Browser Render]` must be <16ms (60fps).
* Heavy JS logic in the `mouse.js` loop will cause "floaty" feel. Physics must be efficient.

**4. OFFLINE CAPABILITY**
* The system might run on a local intranet (Access Point mode) without outside internet.
* All libraries (fonts, icons, sounds) must be stored locally on the ESP32, no CDNs.

---
