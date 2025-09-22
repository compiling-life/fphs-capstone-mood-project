import fetch from "node-fetch";

const apiKey = "YOUR_API_KEY";
const url = "https://genai.googleapis.com/v1beta2/models/gemini-2.5-flash:generateContent";

async function main() {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      contents: "Explain how AI works in a few words",
    }),
  });

  const data = await response.json();
  console.log(data);
}

main();
