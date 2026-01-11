
import { GoogleGenAI, Type } from "@google/genai";

// Vite의 define 설정을 통해 process.env.API_KEY를 안전하게 가져옵니다.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const suggestAIConfig = async (
  description: string,
  availableCurrentFields: string[],
  availableExternalFields: string[] 
): Promise<{ prompt: string; inputPaths: string[]; externalAliases: string[]; logicCode: string }> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `
        You are a highly skilled JavaScript developer specialized in data processing.
        Goal: "${description}"
        
        [INPUT SPECIFICATION]
        - 'row' object contains current row data. Keys are exact column names.
        - Date values in 'row' are provided as JavaScript Date objects.
        - 'global' object contains:
            1. '오늘 날짜': Current Date object.
            2. 'formatDate(date)': Helper function that returns 'YYYY-MM-DD' string.
            3. External aliases as arrays.
        
        [STRICT LOGIC RULES]
        - You must write a JS code snippet that 'return's a value.
        - For dates, return either a 'Date object' or a 'YYYY-MM-DD' string.
        - Example (Add 7 days): "const d = new Date(row['시작일']); d.setDate(d.getDate() + 7); return d;"
        - Example (Targeting Date column): "return global.formatDate(global['오늘 날짜']);"
        - Always handle null/empty checks for row data.
        
        [CONTEXT]
        - Available current fields: ${availableCurrentFields.join(', ')}
        - Available external aliases: ${availableExternalFields.join(', ')}
        
        Generate JSON:
        1. "prompt": User's goal description.
        2. "inputPaths": Array of used column names from row object.
        3. "externalAliases": Array of used external aliases from global object.
        4. "logicCode": The JS function body (just the code, no function wrapper).
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prompt: { type: Type.STRING },
            inputPaths: { type: Type.ARRAY, items: { type: Type.STRING } },
            externalAliases: { type: Type.ARRAY, items: { type: Type.STRING } },
            logicCode: { type: Type.STRING }
          },
          required: ["prompt", "inputPaths", "externalAliases", "logicCode"]
        }
      }
    });
    
    if (!response.text) throw new Error("Empty response");
    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Logic generation failed:", error);
    return { prompt: description, inputPaths: [], externalAliases: [], logicCode: "return '';" };
  }
};
