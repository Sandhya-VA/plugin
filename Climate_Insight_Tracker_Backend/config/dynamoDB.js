const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
require('dotenv').config();

// Initialize DynamoDB client
const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Function to save search data to DynamoDB
async function saveSearchData(data) {
    const params = {
        TableName: process.env.DYNAMODB_TABLE_NAME,
        Item: {
            userid: { S: data.userID },
            visit_timestamp: { N: data.visit_timestamp.toString() },
            searchActivities: {
                L: data.searchActivities.map(activity => ({
                    M: {
                        searchQuery: { S: activity.searchQuery },
                        resultLinks: {
                            L: activity.resultLinks.slice(0, 10).map((link, index) => ({
                                M: {
                                    rank: { N: (index + 1).toString() },
                                    title: { S: link.title || "N/A" },
                                    description: { S: link.description || "N/A" },
                                    url: { S: link.url },
                                },
                            })),
                        },
                        clickedLinks: {
                            L: activity.clickedLinks.map(url => ({ S: url })),
                        },
                    },
                })),
            },
        },
    };

    try {
        const command = new PutItemCommand(params);
        await client.send(command);
        console.log("Data saved successfully.");
        return { message: "Data saved successfully" };
    } catch (error) {
        console.error("Error saving data to DynamoDB:", error.message);
        throw new Error("Failed to save data.");
    }
}

module.exports = { saveSearchData };
