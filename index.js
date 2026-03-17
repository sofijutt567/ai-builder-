const axios = require('axios');

export default async function handler(req, res) {
    // 1. CORS Headers (Zaroori taake Frontend request block na ho)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle Pre-flight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Sirf POST request allow karni hai
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            message: 'Sirf POST requests allowed hain.' 
        });
    }

    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ success: false, message: 'Prompt missing hai!' });
    }

    // 2. 10 API Keys ka Array (Vercel Env Variables se)
    const API_KEYS = [
        process.env.GROQ_KEY_1,
        process.env.GROQ_KEY_2,
        process.env.GROQ_KEY_3,
        process.env.GROQ_KEY_4,
        process.env.GROQ_KEY_5,
        process.env.GROQ_KEY_6,
        process.env.GROQ_KEY_7,
        process.env.GROQ_KEY_8,
        process.env.GROQ_KEY_9,
        process.env.GROQ_KEY_10
    ].filter(key => key && key.trim() !== ""); // Khali keys ko nikal dega

    if (API_KEYS.length === 0) {
        return res.status(500).json({ 
            success: false, 
            message: "Vercel mein koi bhi API Key nahi mili!" 
        });
    }

    // 3. Failover Loop (Ek key fail ho to doosri try karega)
    for (let i = 0; i < API_KEYS.length; i++) {
        try {
            const currentKey = API_KEYS[i];
            
            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: "llama-3.1-70b-versatile",
                    messages: [
                        { 
                            role: "system", 
                            content: "You are an expert web builder. Return ONLY a valid JSON object. Keys must be filenames (e.g., 'index.html') and values must be the full code. No talk, just JSON." 
                        },
                        { role: "user", content: prompt }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.7
                },
                {
                    headers: { 
                        'Authorization': `Bearer ${currentKey}`, 
                        'Content-Type': 'application/json' 
                    },
                    timeout: 25000 // 25 seconds wait karega
                }
            );

            // Agar response mil jaye to return kar do
            const aiContent = JSON.parse(response.data.choices[0].message.content);
            return res.status(200).json({
                success: true,
                files: aiContent,
                used_key_index: i + 1
            });

        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error.response?.data || error.message);
            
            // Agar ye aakhri key thi aur wo bhi fail ho gayi
            if (i === API_KEYS.length - 1) {
                return res.status(500).json({ 
                    success: false, 
                    message: "Saari API keys fail ho chuki hain ya rate limit aa gaya hai.",
                    error: error.message 
                });
            }
            // Agli key try karne ke liye loop chalta rahega
            continue;
        }
    }
}
