import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "Missing Gemini API key. Set VITE_GEMINI_API_KEY in your environment."
  );
}

const ai = new GoogleGenAI({ apiKey });

export const generateAISummary = async (payload) => {
  const { candidate_name, experience, skills, concepts, overall_feedback } =
    payload;

  const formattedSkills = skills
    .map((s) => `- ${s.name}: ${s.rating}`)
    .join("\n");

  const formattedConcepts = concepts
    .map((c) => `- ${c.topic}: ${c.remark}`)
    .join("\n");

//   const prompt = `
// You are an HR evaluation assistant.

// Generate a professional structured performance review.

// Candidate Details:
// Name: ${candidate_name}
// Experience: ${experience}

// Skill Ratings:
// ${formattedSkills}

// Concept Remarks:
// ${formattedConcepts}

// Overall Feedback:
// ${overall_feedback}

// Return ONLY valid JSON in this format:

// {
//   "summary": "2-3 paragraph professional summary",
//   "strengths": ["point 1", "point 2", "point 3"],
//   "weaknesses": ["point 1", "point 2"],
//   "recommendation": "Strong Hire / Hire / Hold / No Hire with reasoning"
// }
// `;

const prompt = `
You are an HR evaluation assistant.

Generate a professional structured performance review.

Important:
All skill ratings are scored out of 5 (e.g., 3/5, 4/5, 5/5).
Interpret:
- 5/5 as Excellent
- 4/5 as Strong
- 3/5 as Competent but needs improvement
- 2/5 as Weak
- 1/5 as Poor

Use the ratings to justify strengths and weaknesses appropriately.

Candidate Details:
Name: ${candidate_name}
Experience: ${experience}

Skill Ratings (out of 5):
${formattedSkills}

Concept Remarks:
${formattedConcepts}

Overall Feedback:
${overall_feedback}

Return ONLY valid JSON in this format:

{
  "summary": "2-3 paragraph professional summary",
  "strengths": ["point 1", "point 2", "point 3"],
  "weaknesses": ["point 1", "point 2"],
  "recommendation": "Strong Hire / Hire / Hold / No Hire with reasoning"
}

Do not include markdown.
Do not include explanation.
Return valid JSON only.
`;
console.log("Generated Prompt:", prompt);
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("AI summary generation failed.");
  }
};