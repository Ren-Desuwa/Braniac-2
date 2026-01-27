# Project Structure & Architecture

## 1. High-Level Overview
**Current Status:** Batch 1.42.0 (Honey Bee Implementation)
The project is a **Role-Based Web Application** designed for a strictly **Offline / Local Intranet** environment.
* **Host:** ESP32 Microcontroller acting as a local webserver (SoftAP or Local IP).
* **Network Constraint:** The system operates without internet access. All assets must be stored locally.
* **Architecture:** Modular Feature Architecture with Iframe-based Game Isolation.

## 2. Directory Tree
The file system is divided into three primary zones: **Root (Auth)**, **Patient (Client)**, and **Physical Therapist (Admin)**.

```text
/ (Root)
├── login.html                  # [Entry] Universal Landing Page (Mock Auth).
├── Notes/                      # Documentation (Change Log, Dev Notes, etc.)
├── patient/                    # [Role] Patient-Specific Interface
│   ├── patient-index.html      # Main SPA Dashboard (Tabs: Dash, Tasks, Games)
│   ├── css/
│   │   ├── base/               # global.css (Variables, Scaling Engine)
│   │   ├── dashboard/          # Dashboard specific styles
│   │   ├── games/              # Layout for Grid & Launcher
│   │   ├── settings/           # Settings layout
│   │   └── tasks/              # Classroom-style task feed
│   ├── js/
│   │   ├── base/               # tab-navigation.js
│   │   ├── dashboard/          
│   │   ├── games/              # launcher.js (Iframe & Stats handling)
│   │   └── settings/           # settings.js (Localstorage & Scale logic)
│   ├── profile/                # Standalone Profile Page
│   │   └── profile-index.html
│   ├── settings/               # Standalone Settings Page
│   │   └── settings-index.html
│   └── games/                  # Standalone Game Packages
│       ├── launcher.html       # The "Console" view hosting the iframe
│       ├── cookout/            # [Game] Cookout
│       ├── honey bee/          # [Game] Honey Bee (Active Dev)
│       │   ├── assets/         # Local images/sounds
│       │   ├── honey-bee-index.html
│       │   ├── honey-bee-script.js
│       │   └── honey-bee-style.css
│       ├── point and click/    # [Game] Point & Click
│       └── raining cats and dogs/ # [Game] Raining Cats & Dogs
└── physical-therapist/         # [Role] Therapist Management Interface (In Progress)
    ├── physical-therapist.html 
    └── [css/js structure mirrors patient]
```
## 3. In-Depth Logic & Data Flow

### A. Authentication & Session (`login.html`)
* **Mechanism:** A zero-dependency HTML form using hardcoded mock credentials (`patient`/`123` or `pt`/`admin`).
* **Storage:** On success, writes a JSON object to `localStorage.getItem('brainiac_session')` containing the user role and timestamp.
* **Routing:** Performs a hard redirect (`window.location.href`) to the appropriate sub-directory (`patient/` or `physical-therapist/`).

### B. Global Scaling Engine (`settings.js`)
* **Purpose:** Accessibility. Allows the UI to scale up for visually impaired users or TV displays.
* **Initialization:** Runs immediately on `DOMContentLoaded`. Reads `localStorage.getItem('brainiac_settings')`.
* **Mechanism:**
    1.  Extracts the `appScale` value (float, default 1.0).
    2.  Injects this value into the CSS Variable `--app-scale` on the `:root` element.
* **CSS Integration:** Stylesheets use `calc()` to multiply base sizes by this variable (e.g., `font-size: calc(1rem * var(--app-scale));`).

### C. Game Launcher Architecture (`launcher.js`)
* **Context:** Runs in the parent window (`launcher.html`), acting as the "Console" or "OS".
* **Isolation Strategy:** Games are loaded into an `iframe` (`#game-frame`) to prevent their CSS/JS from conflicting with the main dashboard.
* **State Management:**
    * **Launch:** Hides the Game Grid -> Sets Iframe Src -> Shows Sidebar.
    * **Close:** Clears Iframe Src -> Hides Sidebar -> Shows Game Grid.
* **Communication Bridge:**
    * Listens for the `message` event on the `window`.
    * **Expected Payload:** `{ type: 'updateStats', score: int, reps: int, sets: int }`.
    * **Action:** Updates the HTML elements in the `#game-stats-sidebar` (Score, Reps, Sets) in real-time.

### D. Game Logic & "Cartridge" Structure (`honey-bee-script.js`)
* **Context:** Runs inside the child `iframe`.
* **Loop:** Uses `requestAnimationFrame` for a 60FPS render loop on an HTML5 Canvas.
* **Phase Logic (Rehab Specific):**
    1.  **Collection Phase (Flexion/Extension):** The "Guide Track" UI shows down arrows. Player must move the bee to flowers.
    2.  **Return Phase (Return to Neutral):** The "Guide Track" UI shows up arrows. Player must return to the hive to bank the point.
* **Data Reporting:**
    * When a scoring event occurs (pollen collected or deposited), the game calls `window.parent.postMessage(...)` to send data up to the Launcher.

## 4. Hardware Integration (Planned)

### Input Pipeline
1.  **Physical Device:** Handheld controller with MPU-9250 (Gyroscope).
2.  **Transport:** WebSocket connection (`ws://192.168.4.1/ws`) hosted by the ESP32.
3.  **Client Handling:** The browser connects to the WebSocket. Incoming JSON packets (`{gx, gy, gz}`) are mapped to screen coordinates (`lastMouse.x`, `lastMouse.y`).
* *Note: Currently simulated via Mouse Event Listeners for development.*