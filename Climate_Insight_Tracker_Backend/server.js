const express = require('express');
const bodyParser = require('body-parser');
const { saveSearchData } = require('./config/dynamoDB');
require('dotenv').config();

const app = express();

// Middleware to parse JSON requests
app.use(bodyParser.json());
app.use(cors());

// Endpoint to store search data
app.post('/storeData', async (req, res) => {
    try {
        console.log("Received data for storage:", req.body);
        const response = await saveSearchData(req.body);
        res.status(200).json(response);
    } catch (error) {
        console.error("Error saving data to DynamoDB:", error.message);
        res.status(500).json({ error: "Failed to save data. Please try again." });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
