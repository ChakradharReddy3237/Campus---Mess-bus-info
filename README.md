# Campus Dashboard

A React-based dashboard for displaying campus mess menu and bus schedules with email integration.

## Features

- **Manual Data Entry**: Copy and paste menu and bus schedule data
- **Email Integration**: Automatically fetch updates from specific email addresses
- **Local Storage**: Data persists between sessions
- **Responsive Design**: Works on desktop, tablet, and mobile

## Email Integration Setup

### Gmail Integration
1. Create a Google Cloud Project
2. Enable Gmail API
3. Create OAuth2 credentials
4. Add your domain to authorized origins
5. Set `REACT_APP_GMAIL_CLIENT_ID` environment variable

### Outlook Integration
1. Register app in Azure AD
2. Configure Mail.Read permissions
3. Set redirect URI to your domain
4. Add Microsoft Authentication Library (MSAL)

### Usage
1. Click "⚙️ Email" button in header
2. Enable email integration
3. Enter the sender's email address
4. Set refresh interval (how often to check for new emails)
5. Authorize access to your email account

The app will automatically check for new emails from the specified sender and update the dashboard when new menu or bus schedule information is found.

## Data Format

### JSON Driven (Recommended)

You no longer need to edit source code to change the 4‑week mess cycle or bus timings.

Edit the JSON files in `public/data`:

* `menuCycle.json` – full 4‑week structure (week13 = weeks 1 & 3, week24 = weeks 2 & 4). Update `startDate` (a Monday) when a new cycle begins.
* `busSchedule.json` – category based bus times: `working`, `saturday`, `sunday` plus `specials` (`palakkadTown`, `wisePark`).

After saving changes, just refresh the browser (hard refresh Ctrl+Shift+R) – data is fetched at load time unless overridden by data you pasted (which is stored in localStorage). To clear overrides, use the Reset button or clear the site storage in your browser dev tools.

### Legacy Paste Format

When copying and pasting data, use this format:

```
Breakfast: Idly, Vada, Sambar, Coconut Chutney
Lunch: Rice, Dal, Vegetable Curry, Sambar
Snacks: Tea, Biscuits
Dinner: Chapati, Paneer Curry, Rice

Buses:
Nila → Sahyadri: 9:00 PM, 10:00 PM, 11:00 PM
Sahyadri → Nila: 9:15 PM, 10:15 PM, 7:30 AM
```

## Development

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Environment Variables

Create a `.env` file in the root directory:

```
REACT_APP_GMAIL_CLIENT_ID=your_gmail_client_id_here
REACT_APP_OUTLOOK_CLIENT_ID=your_outlook_client_id_here
```
