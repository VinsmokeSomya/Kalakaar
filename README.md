# कलाkaar (Kalakaar) - AI-Powered Drawing Assistant

![Kalakaar Demo](https://example.com/demo.gif)

**कलाkaar** (pronounced "Kalakaar") is an interactive drawing application that lets you collaborate with AI to bring your sketches to life. Draw anything, provide a prompt, and watch as Google's Gemini 2.0 AI transforms your creation.

## Features

- 🎨 Interactive canvas with customizable brush size and color
- 🔄 Undo/redo functionality for drawing mistakes
- 🌙 Dark/light mode toggle
- 💾 Download your original sketches
- ✨ AI-powered image generation with Google's Gemini 2.0
- 🔍 Full-screen view for generated images
- 📱 Responsive design for desktop and mobile

## Technology Stack

- **Frontend**: Svelte + SvelteKit
- **Styling**: Tailwind CSS
- **Drawing**: Canvas API
- **AI**: Google Gemini 2.0 API

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
   cd kalakaar
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
