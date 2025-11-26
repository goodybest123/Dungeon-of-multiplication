import { GoogleGenAI, Modality } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateTutorResponse = async (
  context: string,
  lastAction: string,
  userPerformance: string
): Promise<string> => {
  const client = getClient();
  if (!client) return "The magic scrolls are dusty... I cannot speak right now.";

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        Context: You are the "Dungeon Master", a wise, mystical, but kind old wizard guiding a young adventurer (2nd grader) through a math dungeon.
        Current Situation: ${context}
        User's Last Action: ${lastAction}
        Recent Performance: ${userPerformance}
        
        Task: Provide a very short, immersive RPG response (max 2 sentences).
        Use terms like "Hark!", "Adventurer", "Gold", "Scrolls", "Dragons", "Potions".
        If the user made a mistake, explain it using "Groups" (e.g., "Ah, check your stacks of gold again!").
        If the user is doing well, praise their legendary skills.
      `,
      config: {
        maxOutputTokens: 100,
        temperature: 0.8,
      }
    });
    return response.text || "Huzzah! Keep moving forward, hero!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The winds of magic are silent, but your sword is true!";
  }
};

export const generateWordProblem = async (factorA: number, factorB: number): Promise<string> => {
  const client = getClient();
  if (!client) return `You see ${factorA} chests. Each has ${factorB} gems. How many gems total?`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a very short, fun RPG dungeon encounter for a 2nd grader that requires multiplying ${factorA} by ${factorB}.
      Structure it as "You find [A] [Containers], and inside each are [B] [Items]."
      Examples of containers: Chests, Dragon Nests, Piles of Bones, Wizard Hats.
      Examples of items: Gems, Eggs, Skulls, Rabbits.
      Do not give the answer. Keep it under 20 words.`,
      config: {
        maxOutputTokens: 60,
        temperature: 0.9,
      }
    });
    return response.text || `You stumble upon ${factorA} ancient chests. Inside each chest, there are ${factorB} gold coins.`;
  } catch (error) {
    return `You find ${factorA} bags of holding. Each bag contains ${factorB} magic stones. How many stones total?`;
  }
};

// --- Audio / TTS Capabilities ---

export const getSingingVoice = async (text: string): Promise<string | null> => {
  const client = getClient();
  if (!client) return null;

  try {
    // We ask the model to act as a specific character to influence the tone,
    // although the voiceName 'Kore' sets the base timbre.
    // The text prompt guides the prosody to be more musical.
    const prompt = `Sing the following math fact cheerfully and rhythmically, like a nursery rhyme for a child: "${text}"`;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore is often softer/female
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};
