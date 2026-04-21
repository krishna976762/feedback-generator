const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

function extractResponseText(responseJson) {
  if (!responseJson?.choices?.[0]?.message?.content) {
    return "";
  }

  return responseJson.choices[0].message.content;
}

function parseResponseJson(rawText) {
  const trimmed = String(rawText || "").trim();

  if (!trimmed) {
    throw new Error("OpenAI returned an empty response.");
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const jsonSubstring = trimmed.slice(firstBrace, lastBrace + 1);
      return JSON.parse(jsonSubstring);
    }

    throw new Error("Unable to parse JSON from OpenAI response.");
  }
}

function assertResponseShape(parsed) {
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof parsed.summary !== "string" ||
    !Array.isArray(parsed.strengths) ||
    !Array.isArray(parsed.weaknesses) ||
    !["Hire", "No Hire", "Consider"].includes(parsed.recommendation)
  ) {
    throw new Error(
      "OpenAI response did not match the required summary schema."
    );
  }
}

export async function generateAISummary(data) {
  if (!OPENAI_API_KEY) {
    throw new Error(
      "Missing OpenAI API key. Set VITE_OPENAI_API_KEY in your environment."
    );
  }

  const prompt = `You are a hiring feedback assistant.

Receive the candidate feedback details as JSON and return only a JSON object with the following exact shape:
{
  "summary": string,
  "strengths": string[],
  "weaknesses": string[],
  "recommendation": "Hire" | "No Hire" | "Consider"
}

Input data:
${JSON.stringify(data, null, 2)}

Be concise, specific, and return valid JSON only.`;

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(
      `OpenAI API error ${response.status}: ${bodyText || response.statusText}`
    );
  }

  const responseJson = await response.json();
  const rawText = extractResponseText(responseJson);
  const parsed = parseResponseJson(rawText);
  assertResponseShape(parsed);
  return parsed;
}
