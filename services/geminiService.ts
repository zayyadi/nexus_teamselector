
import { GoogleGenAI, Type } from "@google/genai";
import { Team } from "../types";

export const generateTeamIdentities = async (teams: Team[]): Promise<{ name: string; slogan: string }[]> => {
  // Use named parameter to initialize GoogleGenAI with the API key from process.env
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  
  // Create a description of the teams to provide context for the prompt
  const teamsContext = teams.map((t, i) => 
    `Team ${i + 1}: ${t.players.map(p => p.name).join(', ')}`
  ).join('\n');

  const prompt = `
    I have generated ${teams.length} teams for a game. 
    Based on the player names in each team, generate a cool, funny, or creative team name and a short slogan for each.
    
    Teams:
    ${teamsContext}
  `;

  try {
    // Calling generateContent with the model name and prompt directly
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Creative team name" },
              slogan: { type: Type.STRING, description: "Catchy team slogan" }
            },
            required: ["name", "slogan"]
          }
        }
      }
    });

    // Access response.text as a property, not a method
    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini identity generation failed:", error);
    // Return fallback names in case of API failure to maintain UX
    return teams.map((_, i) => ({
      name: `Squad ${i + 1}`,
      slogan: "Ready for action!"
    }));
  }
};
