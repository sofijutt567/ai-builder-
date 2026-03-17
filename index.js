const axios = require('axios');

export default async function handler(req, res) {
    // CORS configuration
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Sirf POST requests allowed hain.' });
    }

    const { prompt } = req.body;

    // 10 API Keys ka array jo Vercel Environment Variables se aayengi
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
    ].filter(key => key); // Jo keys define nahi hain unhe remove kar dega

    if (API_KEYS.length === 0) {
        return res.status(500).json({ success: false, message: "No API Keys found in Vercel settings." });
    }

    // Failover Models
    const MODELS = ["llama-3.1-70b-versatile", "mixtral-8x7b-32768", "llama-3.1-8b-instant"];

    // --- Failover Loop Start ---
    for (let i = 0; i < API_KEYS.length; i++) {
        try {
            const currentKey = API_KEYS[i];
            const currentModel = MODELS[i % MODELS.length];

            console.log(`Trying Attempt ${i + 1} with ${currentModel}`);

            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: currentModel,
                    messages: [
                        { 
                            role: "system", 
                            content: "You are a senior developer. Return ONLY a valid JSON object. Keys=filenames, Values=code. No conversational text." 
                        },
                        { role: "user", content: prompt }
                    ],
                    response_format: { type: "json_object" }
                },
                {
                    headers: { 
                        'Authorization': `Bearer ${currentKey}`, 
                        'Content-Type': 'application/json' 
                    },
                    timeout: 20000 // 20 seconds
                }
            );

            // Agar success ho jaye to data return karo aur loop khatam
            const aiData = JSON.parse(response.data.choices[0].message.content);
            return res.status(200).json({
                success: true,
                files: aiData,
                attempt: i + 1
            });

        } catch (error) {
            console.error(`API Key ${i + 1} Error:`, error.response?.status || error.message);
            
            // Agar aakhri key tak pahunch gaye aur phir bhi fail hua
            if (i === API_KEYS.length - 1) {
                return res.status(500).json({ 
                    success: false, 
                    message: "All 10 API keys failed or rate-limited." 
                });
            }
            // Agli key try karne ke liye loop chalta rahega
            continue;
        }
    }
}
