# Project Structure & Architecture

## 1. High-Level Overview
**Current Status:** Batch 1.0.0 (Initialization)
The project is a **Role-Based Web Application** designed for a strictly **Offline / Local Intranet** environment.
* **Host:** ESP32 Microcontroller acting as a local webserver (SoftAP or Local IP).
* **Network Constraint:** The system operates without internet access. There is no external signal or data connection. Consequently, all assets (CSS, JS, Images, Fonts) must be stored locally on the ESP32's filesystem (LittleFS/SD Card).
* **Architecture:** Modular Feature Architecture.

## 2. Directory Tree
The file system is divided into three primary zones: **Root (Auth)**, **Patient (Client)**, and **Physical Therapist (Admin)**.

```
/ (Root)
├── login.html                  # [Entry] Universal Landing Page.
├── Notes/                      # Documentation
│   ├── Change Log.md
│   ├── Dev Notes.md
│   ├── Key Information.md
│   ├── Rules.md
│   └── Structure.md            # This file
├── patient/                    # [Role] Patient-Specific Interface
│   ├── patient-index.html      # Main Dashboard
│   ├── css/
│   │   ├── base/               # Global resets, variables
│   │   ├── dashboard/          # Dashboard specific styles
│   │   ├── games/              # Shared game styles
│   │   └── settings/           # Settings specific styles
│   ├── js/
│   │   ├── base/               # Core utilities
│   │   ├── dashboard/          # Dashboard logic
│   │   ├── games/              # Game launcher logic
│   │   └── settings/           # Configuration logic
│   └── games/                  # Standalone Game Packages
│       └── [Game Name]/        # Contains index.html, script.js, style.css, assets/
└── physical-therapist/         # [Role] Therapist Management Interface
    ├── physical-therapist.html # Main Dashboard
    ├── css/
    │   ├── base/
    │   ├── dashboard/
    │   ├── games/
    │   ├── settings/
    │   └── tasks/              # [Exclusive] Task assignment UI
    └── js/
        ├── base/
        ├── dashboard/
        ├── games/
        ├── settings/
        └── tasks/              # [Exclusive] Task assignment logic
```
## 3. In-Depth Logic & Data Flow

### `login.html`
* **Input**
    * User login details (username/password) to authenticate with the ESP32 webserver.
* **Output**
    * User session token (received from ESP32) saved to `localStorage`.
    * User redirection to the corresponding dashboard (Patient or Therapist) based on the validated session token.

**Functions**

* **`auth()`**
    * **Param:** `login_details` (Object containing username and password).
    * **What it does:** Sends the login credentials payload to the ESP32 webserver for validation.
* **`receive_auth()`**
    * **What it does:** Catches the response data returned from the ESP32 after the `auth()` call.
    * **Output:** Triggers a redirect to the correct role folder if successful, or prompts the user to retry if authentication failed.