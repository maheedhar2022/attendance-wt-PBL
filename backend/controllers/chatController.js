const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

exports.handleChat = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: 'Messages array is required' });
    }

    // Prepare system prompt based on user role if available
    const roleStr = req.user && req.user.role === 'instructor' ? 'instructor' : 'student';

    const systemPrompt = {
      role: 'system',
      content: `You are the AI assistant for AttendX, a modern digital attendance and session management system. 
You are currently talking to a ${roleStr}.
Your job is to be helpful, concise, and professional. 
Whenever possible, format your responses using markdown for better readability.
If you do not know the answer to a question, politely say so. Do not invent information about AttendX that isn't universally true for classroom management systems.`
    };

    const apiMessages = [systemPrompt, ...messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }))];

    const response = await openai.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: apiMessages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = response.choices[0].message.content;

    res.status(200).json({
      success: true,
      reply
    });
  } catch (error) {
    console.error('OpenAI Chat Error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to process chat request' 
    });
  }
};
