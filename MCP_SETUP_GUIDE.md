# MCP Setup Guide - Browser Tools & Playwright

This guide will enable Claude to see and interact with your browser, making it much easier to debug and fix your application.

## What You'll Get

After setup, Claude will be able to:
- 🔍 **See your browser** - Take screenshots, inspect elements, read console logs
- 🖱️ **Interact with the app** - Click buttons, fill forms, navigate pages
- 🐛 **Debug issues** - See exactly what's broken in real-time
- 🧪 **Run tests** - Automate testing workflows

---

## Prerequisites

- Node.js installed (you already have this)
- npx available (comes with Node.js)

---

## Setup Instructions

### Step 1: Locate Your Claude Config File

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Full path example:** `C:\Users\Momo Mojo\AppData\Roaming\Claude\claude_desktop_config.json`

### Step 2: Edit the Config File

Open `claude_desktop_config.json` in a text editor (Notepad, VSCode, etc.)

If the file doesn't exist or is empty, start with:
```json
{
  "mcpServers": {}
}
```

### Step 3: Add MCP Servers

Add these two MCP servers to the `mcpServers` object:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@executeautomation/playwright-mcp-server"
      ]
    },
    "puppeteer": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-puppeteer"
      ]
    }
  }
}
```

**If you already have other MCP servers configured**, just add these two entries inside the existing `mcpServers` object.

### Step 4: Save and Restart Claude

1. Save the `claude_desktop_config.json` file
2. **Completely quit Claude** (not just close the window - right-click the system tray icon and quit)
3. Restart Claude desktop app
4. Come back to this conversation

---

## Verification

After restarting, Claude should say something like:
- "I now have access to Playwright tools"
- "I can see X new tools available"

You can also check by asking: "What MCP tools do you have access to?"

---

## What Each Server Does

### Playwright MCP (`@executeautomation/playwright-mcp-server`)
- Browser automation (Chromium, Firefox, WebKit)
- Advanced interactions (hover, drag-drop, file uploads)
- Network interception and mocking
- Video recording of sessions
- Multi-browser testing

### Puppeteer MCP (`@modelcontextprotocol/server-puppeteer`)
- Chrome/Chromium automation
- Take screenshots
- Read console logs and errors
- Navigate and interact with pages
- Execute JavaScript in page context

---

## Alternative: Chrome DevTools MCP

If the above don't work, try the Chrome DevTools MCP:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "-y",
        "@automatalabs/mcp-server-chrome"
      ]
    }
  }
}
```

This gives Claude direct access to Chrome DevTools Protocol.

---

## Troubleshooting

### "MCP server failed to start"
- Make sure npx is in your PATH: `npx --version`
- Try installing globally first: `npm install -g @executeautomation/playwright-mcp-server`

### "Command not found"
- Check that Node.js is installed: `node --version`
- Restart your terminal/command prompt

### Config file syntax errors
- Validate JSON at https://jsonlint.com
- Make sure all brackets and commas are correct
- No trailing commas before closing braces

---

## Full Example Config

Here's a complete example if you're starting fresh:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@executeautomation/playwright-mcp-server"]
    },
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "D:\\projects main\\the_perfect_RefreshLawn"]
    }
  },
  "globalShortcut": "Ctrl+Space"
}
```

---

## After Setup

Once you restart Claude with the MCP servers enabled:

1. Open your app in browser: http://localhost:8090
2. Tell me: "The MCP servers are set up, please inspect my app"
3. I'll be able to:
   - Take screenshots of any issues
   - Read console errors in real-time
   - Click through your workflows
   - Identify exactly what's broken

---

## Security Note

These MCP servers run locally on your machine and only have access to what you explicitly allow. They don't send data to external servers.

