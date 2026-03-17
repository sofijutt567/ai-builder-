const axios = require('axios');

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: 'Sirf POST requests allowed hain.' });

    const { prompt } = req.body;
    const API_KEYS = [
        process.env.GROQ_KEY_1, process.env.GROQ_KEY_2, process.env.GROQ_KEY_3,
        process.env.GROQ_KEY_4, process.env.GROQ_KEY_5, process.env.GROQ_KEY_6,
        process.env.GROQ_KEY_7, process.env.GROQ_KEY_8, process.env.GROQ_KEY_9,
        process.env.GROQ_KEY_10
    ].filter(k => k);

    for (let i = 0; i < API_KEYS.length; i++) {
        try {
            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: "llama-3.1-70b-versatile",
                messages: [
                    { role: "system", content: "Return ONLY valid JSON. Keys=filenames, Values=code." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }
            }, {
                headers: { 'Authorization': `Bearer ${API_KEYS[i]}` },
                timeout: 15000
            });

            return res.status(200).json({ success: true, files: JSON.parse(response.data.choices[0].message.content) });
        } catch (e) {
            if (i === API_KEYS.length - 1) return res.status(500).json({ success: false, message: "All keys failed." });
        }
    }
}
