import { GoogleGenerativeAI } from "@google/generative-ai";
import { error, json } from '@sveltejs/kit';
import { GEMINI_API_KEY } from '$env/static/private';

// Basic check for API key existence
if (!GEMINI_API_KEY) {
  // Log an error during server startup if the key is missing
  console.error("CRITICAL ERROR: GEMINI_API_KEY environment variable not set.");
  // Optionally throw an error to prevent the server from starting without a key
  // throw new Error("GEMINI_API_KEY environment variable not set.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || ""); // Provide default empty string if key missing at runtime

// Configure the specific model for image generation
// Note: Casting generationConfig to 'any' to bypass potential type mismatches
// in older or slightly different SDK versions compared to where this config was sourced.
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp-image-generation",
  generationConfig: {
    responseModalities: ['Text', 'Image']
  } as any,
});

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }: { request: Request }) {
  // Check if API key is actually available at the time of the request
  if (!GEMINI_API_KEY) {
    console.error("API call attempted without GEMINI_API_KEY.");
    return error(500, 'Server configuration error: API key missing.');
  }

  try {
    const { prompt, imageData } = await request.json();

    if (!prompt || !imageData) {
      return error(400, 'Missing prompt or image data');
    }

    // Ensure imageData is just the base64 string
    const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
    if (!base64Data) {
       return error(400, 'Invalid image data format');
    }

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/png",
      },
    };

    const textPart = { text: `${prompt}. Keep the same minimal line doodle style.` };
    const generationContent = [ imagePart, textPart ];

    console.log(`Calling Gemini API (${model.model})... Prompt: "${textPart.text}"`);

    const result = await model.generateContent(generationContent);
    const response = result.response;
    console.log("Gemini API response received.");

    let textResult = '';
    let imageResult = null; // To store { mimeType: string, data: string }

    // Safely access response candidates and parts
    if (response?.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.text) {
                textResult += part.text;
                console.log("Found text part");
            }
            if (part.inlineData?.data) { // Check for data existence
                console.log(`Found image part with mimeType: ${part.inlineData.mimeType}`);
                imageResult = {
                   mimeType: part.inlineData.mimeType,
                   data: part.inlineData.data
                };
                // Assuming we only want the first image if multiple are returned
                break; 
            }
        }
    } else {
        // Attempt fallback if structure is unexpected or empty
        console.log("Response structure did not contain expected parts, attempting fallback.");
        try {
           textResult = response.text(); // This might still contain useful text or error info
           console.log("Fallback text obtained.");
        } catch (e) {
           console.error("Error getting fallback text:", e);
        }
    }

    // Check if we got any usable result
    if (!textResult && !imageResult) {
        console.warn("Gemini response parsed, but contained no usable text or image data.");
        // Decide if this is an error or just an empty response case
        // Returning success=false but status 200 might be an option too
        return error(500, 'Gemini response did not contain usable content.');
    }

    console.log(`Sending response: HasText=${!!textResult}, HasImage=${!!imageResult}`);
    return json({ 
        text: textResult,
        imageData: imageResult // Will be null if no image found
    });

  } catch (err) {
    // Log the specific error for server-side debugging
    console.error("API Route Error:", err);
    
    // Default error message
    let errorMessage = 'Failed to process request.';
    let statusCode = 500;

    // Improve error handling based on error type
    if (err instanceof Error) {
        errorMessage = err.message; // Use the error's message
        // Potentially check for specific API errors if the SDK throws typed errors
        // or if the error structure is known (e.g., check err.code, err.status)
    }
    if (err instanceof SyntaxError) {
        errorMessage = 'Invalid request format.';
        statusCode = 400;
    } 
    // Consider adding checks for network errors if fetch fails
    else if (err instanceof TypeError && err.message.includes('fetch')) {
       errorMessage = 'Network error communicating with the API.';
       statusCode = 503; // Service Unavailable
    }

    // Return a structured error response
    return error(statusCode, { message: errorMessage }); // SvelteKit error helper expects specific format
  }
} 