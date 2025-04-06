# कलाkaar (Kalakaar) - AI-Powered Drawing Assistant

![kalakar-logo](https://github.com/user-attachments/assets/6ccbcd98-7558-46e2-8693-0bffb7aedf91)

**कलाkaar** (pronounced "Kalakaar") is an interactive drawing application that lets you collaborate with AI to bring your sketches to life. Draw anything, provide a prompt, and watch as Google's Gemini 2.0 AI transforms your creation.

## Features

- 🎨 **Interactive Canvas:** Draw freely using various tools.
- ✨ **AI Image Generation:** Describe transformations via text prompt and use Google Gemini to generate images based on your drawing.
- Tools:
  - 🖌️ **Multiple Brushes:** Pen, Marker, Crayon, Spray, Airbrush, Charcoal, Pencil, Watercolor, Oil, Calligraphy.
  - 🌈 **Color Palette:** Select custom colors or choose from predefined swatches.
  - ✏️ **Width Slider:** Adjust brush/eraser size with a live numerical indicator.
  - 🧼 **Eraser:** Erase parts of your drawing.
  - 🇹 **Text Tool:** Add text directly onto the canvas.
- 🖼️ **Canvas Controls:**
  - 📐 **Aspect Ratio:** Select from various canvas sizes (16:9, 1:1, 4:3, etc.).
  - 🔍 **Zoom & Pan:** Zoom in/out and pan the canvas (mouse & touch compatible).
- ↩️ **Undo/Redo:** Step backward and forward through your drawing actions.
- 💾 **Download:** Save your original sketch as a PNG image.
- 💡 **AI Assistance:**
  - 🏷️ **Style Presets:** Quickly append common style keywords (Watercolor, Cartoon, Pixel Art, etc.) to your prompt.
  - ⭐ **Custom Styles:** Save and reuse your own frequently used style prompts.
  - ❓ **Prompt Templates:** Get ideas with categorized prompt starters.
- 🌙 **Dark/Light Mode:** Switch between themes.
- 📱 **Responsive Design:** Works on desktop and mobile devices.
- 🖼️ **Fullscreen View:** View generated images larger.
- ⌨️ **Keyboard Shortcuts:** Access common tools and actions quickly (viewable in sidebar).

## Technology Stack

- **Frontend**: Svelte + SvelteKit
- **Styling**: Tailwind CSS
- **Drawing**: Canvas API
- **AI**: Google Gemini 2.0 API

## Project Structure

```
kalakaar/
├── .github/                 # GitHub Actions workflows (e.g., deployment)
│   └── workflows/
│       └── deploy.yml
├── src/
│   ├── lib/                 # Reusable Svelte components (Canvas, FeedbackForm, etc.)
│   ├── routes/              # Application pages and API endpoints
│   │   ├── +layout.svelte   # Main layout component
│   │   ├── +page.svelte     # Main application page component
│   │   └── api/
│   │       └── gemini/      # API endpoint for Gemini interaction
│   │           └── +server.ts
│   ├── app.css              # Global CSS styles
│   └── app.html             # Main HTML template
├── static/                  # Static assets (favicon, logo, etc.)
│   ├── favicon.png
│   └── kalakar-logo.png     # <-- Make sure this file exists here!
├── .env.local               # Local environment variables (API Key - DO NOT COMMIT)
├── .gitignore               # Files/directories ignored by Git
├── .dockerignore            # Files/directories ignored by Docker
├── Dockerfile               # Instructions for building the Docker image
├── docker-compose.yml       # Docker Compose configuration for local development
├── package.json             # Project metadata, dependencies, and scripts
├── README.md                # This file
├── roadmap.md               # Project development roadmap
├── svelte.config.js         # SvelteKit configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── vite.config.ts           # Vite configuration
```

## Getting Started

### Prerequisites

- Node.js 16+
- A Google Gemini API key ([Get one here](https://ai.google.dev/))

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/kalakaar.git
   cd kalakaar
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env.local` file in the root directory:
   ```
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Usage

1. Use the drawing canvas to create a sketch
2. Customize your brush size and color using the controls
3. Enter a prompt describing how you want the AI to transform your drawing
4. Click "Generate Image" and watch your creation come to life!
5. Download or view your AI-generated image in full-screen mode

## Deployment

### Using Docker

```
docker-compose up -d
```

### Manual Deployment

Build the production version:

```
npm run build
```

Then serve the application:

```
npm run start
```

## Roadmap

See [roadmap.md](roadmap.md) for planned features and improvements.

## License

This project is licensed under the Apache 2.0 License - see the LICENSE file for details.

## Acknowledgments

- Google Gemini 2.0 API for image generation capabilities
- The Svelte and SvelteKit teams for their amazing frameworks
