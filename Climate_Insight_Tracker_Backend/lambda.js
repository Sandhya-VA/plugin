const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { OpenAI } = require("openai");

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.handler = async (event) => {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
    };

    try {
        const body = JSON.parse(event.body || "{}");
        const { userID, visit_timestamp, searchActivities } = body;

        if (!userID || !searchActivities?.length) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing required fields" }) };
        }

        // Store raw session data in DynamoDB
        await dynamo.send(new PutItemCommand({
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Item: {
                userid: { S: userID },
                visit_timestamp: { N: visit_timestamp.toString() },
                searchActivities: {
                    L: searchActivities.map(a => ({
                        M: {
                            searchQuery: { S: a.searchQuery },
                            resultLinks: {
                                L: (a.resultLinks || []).slice(0, 10).map((link, i) => ({
                                    M: {
                                        rank: { N: (i + 1).toString() },
                                        title: { S: link.title || "N/A" },
                                        url: { S: link.url || "N/A" },
                                    }
                                }))
                            },
                            clickedLinks: { L: (a.clickedLinks || []).map(url => ({ S: url })) }
                        }
                    }))
                }
            }
        }));

        // Build GPT-3.5 prompt from the session's search queries and result links
        const queryList = searchActivities
            .map(a => `Query: "${a.searchQuery}"\nTop results: ${a.resultLinks.slice(0, 3).map(r => r.title).join(", ")}`)
            .join("\n\n");

        const prompt = `You are a media bias analyst. Analyze the following search session for signs of media bias, filter bubbles, or skewed information exposure.

${queryList}

Respond in JSON with this structure:
{
  "overallBiasScore": <0-10, where 0 = no bias, 10 = strong bias>,
  "biasType": "<political | commercial | confirmation | none>",
  "summary": "<2-3 sentence summary of detected patterns>",
  "flaggedQueries": ["<query1>", "<query2>"],
  "recommendation": "<one actionable suggestion for more balanced information exposure>"
}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 400,
            temperature: 0.3,
        });

        let biasReport = null;
        try {
            const raw = completion.choices[0].message.content.trim();
            biasReport = JSON.parse(raw.replace(/```json|```/g, "").trim());
        } catch {
            biasReport = { summary: completion.choices[0].message.content };
        }

        // Store bias report alongside session data
        await dynamo.send(new PutItemCommand({
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Item: {
                userid: { S: `${userID}#bias` },
                visit_timestamp: { N: visit_timestamp.toString() },
                biasScore: { N: String(biasReport.overallBiasScore || 0) },
                biasType: { S: biasReport.biasType || "none" },
                summary: { S: biasReport.summary || "" },
                recommendation: { S: biasReport.recommendation || "" },
            }
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: "Session analyzed", biasReport }),
        };

    } catch (err) {
        console.error("Lambda error:", err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Internal server error" }),
        };
    }
};
