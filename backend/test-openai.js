require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  try {
    console.log('Sending request to OpenAI...');
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'hello' }],
    });
    console.log('Response:', response.choices[0].message.content);
  } catch (error) {
    console.error('ERROR from OpenAI:', error.message);
    if (error.response) {
      console.error(error.response.data);
    }
  }
}
main();
