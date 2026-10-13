# Chat Studio

A responsive ChatGPT-inspired chat UI built with HTML, CSS, and vanilla JavaScript. It includes local conversation history, new/delete/clear chat, export, theme toggle, copy replies, responsive sidebar, and demo mode. An optional Node.js backend connects to Gemini for real AI responses.

## 1. Open the frontend

For the interface alone, open `index.html` in your browser. Demo mode works without an API key. For a smoother local development experience, use VS Code's Live Server extension.

## 2. Enable real AI replies

You need Node.js 18 or newer.

1. Open this project folder in a terminal.
2. Install backend packages:

   ```bash
   npm install
   ```

3. Copy `.env.example` to a new file named `.env`.
4. Create a Gemini API key in Google AI Studio and put it in `.env`:

   ```env
   GEMINI_API_KEY=your_actual_key_here
   PORT=3000
   ```

5. Start the backend:

   ```bash
   npm start
   ```

6. Open `index.html` (or use Live Server), click the gear icon in the sidebar, and enable **Use real AI**.

The backend runs at `http://localhost:3000`. Keep the terminal open while chatting.

## Important security notes

- Never paste your API key into `script.js`, `index.html`, GitHub, or any public repository.
- `.env` is excluded by `.gitignore`. Do not commit it.
- API usage and pricing depend on your provider account and current plan. Check the provider's current billing and quota information before using the API.
- This is a learning project, not the official ChatGPT product. It does not access your OpenAI/ChatGPT account or conversation history.
- Browser chat history is stored in `localStorage` on the device. Clearing browser site data removes it.
