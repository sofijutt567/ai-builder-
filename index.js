require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. API KEYS LOADING ---
const API_KEYS = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5
].filter(key => key);

app.get('/', (req, res) => {
    res.send('🚀 AI Code Generator (Parallel Engine) is LIVE!');
});

// --- 2. HELPER: CALL GROQ (Code Expert Mode) ---
async function callSingleGroq(apiKey, subPrompt) {
    try {
        const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are an expert Full-Stack Web Developer.
                    STRICT RULES:
                    - Return ONLY a valid JSON object.
                    - Root key must be "files".
                    - Each file must have "fileName" and "content" (the source code).
                    - No explanations or markdown formatting outside JSON.
                    - Format: {"files": [{"fileName":"index.html","content":"<html>...</html>"}]}`
                },
                { role: "user", content: subPrompt }
            ],
            temperature: 0.2, // Coding ke liye temperature low rakha hai taake logic sahi ho
            response_format: { type: "json_object" }
        }, {
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            timeout: 60000 // Code generation mein time lag sakta hai
        });
        
        const content = response.data.choices[0].message.content;
        return typeof content === 'string' ? JSON.parse(content) : content;
    } catch (error) {
        console.error(`Key Error: ${error.message}`);
        return null;
    }
}

// --- 3. MAIN ROUTE: PARALLEL CODE GENERATION ---
app.post('/api/process-code', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is empty" });

    // Agar prompt "Full Project" ya "Complex" hai to parallel use karein
    if (prompt.toLowerCase().includes('project') || prompt.toLowerCase().includes('build') && API_KEYS.length > 1) {
        console.log(`⚡ Splitting code tasks across ${API_KEYS.length} keys...`);
        
        // Modules ko divide kar diya taake keys alag alag kaam karein
        const modules = [
            "Frontend (HTML/CSS structure)",
            "Interactivity (Main JavaScript logic)",
            "Data & API (Backend/JSON handling)",
            "Utilities (Helper functions & Styles)",
            "Documentation (README and setup guide)"
        ];

        const tasks = API_KEYS.map((key, index) => {
            const moduleName = modules[index] || "Additional Components";
            const subPrompt = `Task: ${moduleName}. Context: ${prompt}. Generate relevant source code files for this specific part. Return as JSON files array.`;
            return callSingleGroq(key, subPrompt);
        });

        try {
            const results = await Promise.all(tasks);
            let combinedFiles = [];
            let fileNamesSet = new Set();

            results.forEach(data => {
                if (data && data.files) {
                    data.files.forEach(file => {
                        if (!fileNamesSet.has(file.fileName)) {
                            fileNamesSet.add(file.fileName);
                            combinedFiles.push(file);
                        }
                    });
                }
            });

            console.log(`✅ Parallel Success: Generated ${combinedFiles.length} Code Files.`);
            return res.json({ success: true, files: combinedFiles });
        } catch (err) {
            console.error("Parallel generation failed, falling back...");
        }
    }

    // --- FALLBACK: SINGLE KEY FOR SMALL SNIPPETS ---
    for (let i = 0; i < API_KEYS.length; i++) {
        const data = await callSingleGroq(API_KEYS[i], prompt);
        if (data && data.files) {
            console.log(`✅ Success with Key #${i+1}`);
            return res.json({ success: true, files: data.files });
        }
    }

    res.status(500).json({ error: "All API keys failed or limit reached." });
});

// --- 4. EXPORT ---
module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Code Engine running on port ${PORT}`));
}
