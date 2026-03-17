require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// API Keys Loading
const API_KEYS = [
    process.env.GROQ_KEY_1,
    process.env.GROQ_KEY_2,
    process.env.GROQ_KEY_3,
    process.env.GROQ_KEY_4,
    process.env.GROQ_KEY_5
].filter(key => key);

async function callSingleGroq(apiKey, subPrompt) {
    try {
        const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "You are an expert Full-Stack Web Developer. Return ONLY a JSON object with a root key 'files'. Each file MUST have 'fileName' and 'content'. Example: {'files': [{'fileName': 'index.html', 'content': '...'}]}"
                },
                { role: "user", content: subPrompt }
            ],
            temperature: 0.2,
            response_format: { type: "json_object" }
        }, {
            headers: { "Authorization": `Bearer ${apiKey}` },
            timeout: 60000 
        });
        return JSON.parse(response.data.choices[0].message.content);
    } catch (error) { return null; }
}

app.post('/api/process-code', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt empty hai" });

    // Parallel Split Logic
    const modules = ["Frontend (HTML/Tailwind)", "CSS/Styling", "JavaScript Interactivity", "Backend/API logic", "Readme/Setup"];
    
    const tasks = API_KEYS.map((key, index) => {
        const subPrompt = `Project Idea: ${prompt}. Part: ${modules[index]}. Generate relevant code files.`;
        return callSingleGroq(key, subPrompt);
    });

    try {
        const results = await Promise.all(tasks);
        let allFiles = [];
        results.forEach(res => { if(res && res.files) allFiles = [...allFiles, ...res.files]; });
        
        res.json({ success: true, files: allFiles });
    } catch (err) {
        res.status(500).json({ error: "Parallel processing fail ho gayi" });
    }
});

module.exports = app;
