# Recommendations & Architecture Backlog

## 1. Authentication & Roles Refactor
*The current system assumes a single generic user. We need to split this into two distinct flows.*

- [ ] **Physical Therapist (PT) Login**
    - **Goal:** Allow the PT to manage patients and set instructions.
    - **Mechanism:** Standard secure login (Username/Password).
    - **Features:** - Dashboard to view list of patients.
        - Ability to "Give Instructions to do Work" (Patient Management).
        - View progress data from specific patients.
- [ ] **Patient Login**
    - **Goal:** Ultra-low friction login for disabled users.
    - **Mechanism:** - **Image-based Login:** Grid of profile pictures (PT accounts).
        - **Click to Fill:** Clicking a picture auto-fills the username.
        - **RF ID Login:** (Optional hardware integration) Swipe a card to log in instantly.
    - **Constraint:** Must not require complex typing.

## 2. Hardware & Connectivity
*Improvements for the physical controller and ESP32 backend.*

- [ ] **Dual Glove Support**
    - **Description:** System must handle input from two separate gyro sensors simultaneously (Left Hand / Right Hand).
    - **UI Requirement:** A simple checkbox or toggle in Settings to enable/disable the second glove.
- [ ] **ESP32 API / Auth**
    - **Goal:** Move authentication logic to the ESP32.
    - **Implementation:** - `api/login` endpoint on the ESP32 webserver.
        - Token-based auth (simple session token) to keep the user logged in during the session.
- [ ] **MDNS Capture Fix**
    - **Problem:** Connecting to `brainiac.local` can be flaky.
    - **Solution:** Improve mDNS responder on ESP32 or provide a fallback IP discovery mechanism.
- [ ] **Auto-Calibrate Gyro**
    - **Idea:** "Fake" calibration or "One User" mode where the system sets the center point automatically on startup, rather than asking the user to hold still.

## 3. Patient Side Improvements
*Enhancing the user experience for the patient specifically.*

- [ ] **Profile UI**
    - A visual dashboard showing their avatar, streak, and daily goals.
- [ ] **Progression System**
    - **Gating:** Can do Lower Level Games but *not* Higher Level games until unlocked.
    - **Logic:** PT sets the "Max Level" or the system unlocks based on score thresholds.
- [ ] **Feedback Loop**
    - **Auto-Reply:** System provides instant positive reinforcement ("Great job!", "Try again!") based on performance.
    - **Rate The Game:** Simple smiley-face rating (Happy/Neutral/Sad) after a game finishes to track user enjoyment.
- [ ] **Game Tutorial**
    - An interactive overlay or "Attract Mode" video showing how to play before the game starts.

## 4. Physical Therapy Data Gathering
*New metrics to track specific rehabilitation movements.*

- [ ] **Horizontal / Vertical Movement Tracking**
    - Use the Stepper Motor / Gyro Data to map range of motion.
- [ ] **Specific Movement Metrics**
    - **Abduction / Sidefront:** Moving arm away from body.
    - **Flexion / Upfront:** Lifting arm forward.
    - **Internal Rotation:** Rotating shoulder inward.
    - **External Rotation:** Rotating shoulder outward.
- [ ] **Time/Duration Metrics**
    - Track not just *score*, but *endurance* (how long they can maintain the activity).

## 5. New Game Concepts
*Games designed specifically for the movements above.*

- [ ] **Abduction Game:** e.g., "Painting a Wall" (Side to side).
- [ ] **Flexion Game:** e.g., "Climbing a Ladder" (Up and down).
- [ ] **Rotation Game:** e.g., "Turning a Valve" or "Dialing a Safe".
- [ ] **Camera Integration:** (If feasible) Use a webcam to track body posture alongside gyro data.
      
## 6.  Movements for games
- flexion
- [ ] doremi game in tiktok but wit harm
- extension
- [ ] hole and ball game, push to increase ball size to fill the hole
      
## 7.  Sound
- [ ] background sound
- [ ] sound effect buttons
- [ ] voice instructions

## 8. Game Options 
- [ ] 3, 2, 1 start