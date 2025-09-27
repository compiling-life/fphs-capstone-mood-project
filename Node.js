import fetch from "node-fetch";

const apiKey = "YOUR_API_KEY";

const url = "https://genai.googleapis.com/v1beta2/models/gemini-2.5-flash:generateContent";

async function main() 
{
  try 
  {
    const response = await fetch(url, 
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(
      {
        contents: 
        [
          { type: "text", text: "Explain how AI works in a few words" }
        ],
      }),
    });

    if (!response.ok) 
    {
      const errorText = await response.text();

      throw new Error(`API error: ${errorText}`);
    }

    const data = await response.json();

    console.log(JSON.stringify(data, null, 2));
  } 
  
  catch (err) 
  {
    console.error("Error calling Gemini API:", err);
  }
}

main();
