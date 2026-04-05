require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

async function main() {
  try {
    console.log('Sending request to Groq...');
    const response = await openai.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: 'hello' }],
    });
    console.log('Response:', response.choices[0].message.content);
  } catch (error) {
    console.error('ERROR from Groq:', error.message);
    if (error.response) {
      console.error(error.response.data);
    }
  }
}
main();
