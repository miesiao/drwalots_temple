
import { GoogleGenAI, Type } from "@google/genai";
import { UserInfo } from "../types.ts";

export const processTranscriptWithAI = async (transcript: string): Promise<UserInfo> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `使用者對神明說了這段話： "${transcript}"。請將內容整理成 JSON 格式。`,
    config: {
      systemInstruction: `你是一位專業的廟宇助理。請從這段話中提取資訊：
      1. name (姓名)
      2. birthday (生辰，如：農曆或是民國出生年)
      3. address (住址)
      4. quest (求籤之事)
      
      如果資訊缺失，請填入空字串。只返回 JSON 物件。`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          birthday: { type: Type.STRING },
          address: { type: Type.STRING },
          quest: { type: Type.STRING },
        },
        required: ["name", "birthday", "address", "quest"]
      }
    }
  });

  try {
    const result = JSON.parse(response.text || "{}");
    return {
      name: result.name || '',
      birthday: result.birthday || '',
      address: result.address || '',
      quest: result.quest || '',
    };
  } catch (e) {
    console.error("AI parsing error", e);
    return { name: '', birthday: '', address: '', quest: transcript };
  }
};
