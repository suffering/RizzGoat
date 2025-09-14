interface PickupLineParams {
  tone: string;
  spiceLevel: string;
  context?: string;
}

interface ScreenshotAnalysis {
  safe: { text: string; rationale: string };
  witty: { text: string; rationale: string };
  bold: { text: string; rationale: string };
}

interface ChatParams {
  message: string;
}

interface ScreenshotParams {
  base64Image: string;
  amplifyBold?: boolean;
}

// Use the backend API for all AI requests
async function callBackendAI(messages: any[], retries = 3): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.completion || '';
      }
      
      // Handle rate limiting (429) and server errors (5xx)
      if (response.status === 429 || response.status >= 500) {
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000; // Exponential backoff with jitter
          console.log(`Rate limited or server error (${response.status}). Retrying in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // For other errors, don't retry
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Backend API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      
      // Only retry on network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Network error. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Max retries exceeded');
}

export async function generatePickupLine(params: PickupLineParams): Promise<string> {
  try {
    const messages = [
      {
        role: "system",
        content: "You are a witty, respectful dating assistant. Generate pickup lines that are clever, tasteful, and PG-13. Never use crude language, negging, or disrespectful content. Keep responses under 20 words.",
      },
      {
        role: "user",
        content: `Generate a ${params.tone.toLowerCase()} pickup line that is ${params.spiceLevel.toLowerCase()}. ${
          params.context ? `Context: ${params.context}` : ""
        }. Output only the pickup line, nothing else.`,
      },
    ];

    const result = await callBackendAI(messages);
    return result || "Hey there! Mind if I steal a moment of your time?";
  } catch (error) {
    console.error("Error generating pickup line:", error);
    return "Hey there! Mind if I steal a moment of your time?";
  }
}

export async function analyzeScreenshot(params: ScreenshotParams): Promise<ScreenshotAnalysis> {
  try {
    const boldNote = params.amplifyBold
      ? " Make the Bold option extra spicy, audacious, and flirty (still PG-13, respectful). Increase boldness by ~20% vs normal."
      : "";

    const messages = [
      {
        role: "system",
        content:
          "You are a dating conversation analyst. Analyze the screenshot and provide 3 reply suggestions: Safe (friendly, low-risk), Witty (clever, engaging), and Bold (confident, flirty but respectful). Each reply should be under 30 words with a brief rationale." +
          boldNote,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Analyze this dating conversation screenshot and provide 3 reply options with rationales. Format as JSON: {safe: {text: '', rationale: ''}, witty: {text: '', rationale: ''}, bold: {text: '', rationale: ''}}",
          },
          {
            type: "image",
            image: params.base64Image,
          },
        ],
      },
    ];

    const result = await callBackendAI(messages);
    try {
      return JSON.parse(result);
    } catch {
      return {
        safe: {
          text: "That's interesting! Tell me more about that.",
          rationale: "Keeps conversation flowing without risk",
        },
        witty: {
          text: "Well, this conversation just got interesting 😏",
          rationale: "Playful and engaging",
        },
        bold: {
          text: "I like where this is going. Coffee tomorrow?",
          rationale: "Confident and moves things forward",
        },
      };
    }
  } catch (error) {
    console.error("Error analyzing screenshot:", error);
    return {
      safe: {
        text: "That's interesting! Tell me more about that.",
        rationale: "Keeps conversation flowing without risk",
      },
      witty: {
        text: "Well, this conversation just got interesting 😏",
        rationale: "Playful and engaging",
      },
      bold: {
        text: "I like where this is going. Coffee tomorrow?",
        rationale: "Confident and moves things forward",
      },
    };
  }
}

export async function getChatAdvice(params: ChatParams): Promise<string> {
  try {
    const messages = [
      {
        role: "system",
        content: "You are RizzGoat, a friendly and knowledgeable dating coach. Provide structured advice in this format:\n\n💬 Say this:\n[1-2 line suggestion]\n\n🔄 If they respond with X:\n[Conditional advice]\n\n⚠️ Pitfalls to avoid:\n• [Bullet point]\n• [Bullet point]\n\nKeep advice practical, respectful, and confidence-building.",
      },
      {
        role: "user",
        content: params.message,
      },
    ];

    const result = await callBackendAI(messages);
    return result || "I'm here to help! Could you provide more details about your situation?";
  } catch (error) {
    console.error("Error getting chat advice:", error);
    return "I'm here to help! Could you provide more details about your situation?";
  }
}

// Legacy functions for backward compatibility
export async function analyzeScreenshotLegacy(base64Image: string): Promise<ScreenshotAnalysis> {
  return analyzeScreenshot({ base64Image });
}

export async function getChatAdviceLegacy(message: string): Promise<string> {
  return getChatAdvice({ message });
}