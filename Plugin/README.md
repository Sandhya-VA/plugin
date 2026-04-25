# Climate Insight Tracker

Chrome extension that detects media bias in real time as you browse. Captures search queries and clicked results, sends them to AWS Lambda, which runs GPT-3.5 analysis and stores a bias report in DynamoDB — all without disrupting your browsing.

---

## How it works

The extension runs in the background while you search. When your session ends, it packages your search queries and the result links you clicked, sends them to a Lambda function via API Gateway, and gets back a bias analysis: score, bias type (political, commercial, confirmation), flagged queries, and a recommendation for more balanced exposure. The whole round trip stays under 200ms.

```
User searches on Google
        |
Chrome extension captures queries + clicked links
        |
Session ends → POST to API Gateway
        |
AWS Lambda
        |
    +---+---+
    |       |
DynamoDB   GPT-3.5
(raw data)  (bias analysis)
    |       |
    +---+---+
        |
Bias report returned to extension popup
```

---

## Stack

- **Chrome Extension** — Manifest V3, JavaScript
- **Backend** — AWS Lambda (Node.js)
- **AI Analysis** — GPT-3.5-turbo via OpenAI API
- **Database** — AWS DynamoDB
- **API** — AWS API Gateway

---

## Bias analysis

GPT-3.5 receives the search queries and top result titles, then returns:

```json
{
  "overallBiasScore": 6,
  "biasType": "political",
  "summary": "Search patterns show consistent preference for left-leaning sources...",
  "flaggedQueries": ["climate policy", "energy regulation"],
  "recommendation": "Try including terms like 'both sides of' or 'criticism of' to broaden exposure"
}
```

Score is 0–10 (0 = no bias, 10 = strong bias). Results are stored per session in DynamoDB so patterns can be analyzed over time.

---

## Setup

**Lambda:**
```bash
cd lambda
npm install

# Set environment variables in Lambda console or .env:
cp .env.example .env
# Fill in AWS_REGION, DYNAMODB_TABLE_NAME, OPENAI_API_KEY
```

Deploy to Lambda and wire up API Gateway (POST `/analyze`). Update `API_ENDPOINT` in `extension/background.js` with your API Gateway URL.

**DynamoDB:**
Create a table with `userid` (String) as the partition key and `visit_timestamp` (Number) as the sort key.

**Chrome Extension:**
1. Open `chrome://extensions/`
2. Enable Developer Mode
3. Load Unpacked → select the `extension/` folder

---

## Why Lambda over a persistent server

The extension is used intermittently — sessions are short bursts of activity with long gaps between them. A persistent server would sit idle almost all the time. Lambda scales to zero when unused and handles burst traffic automatically, which makes it the right fit here. Cold starts are acceptable since the analysis happens after the session ends, not during browsing.

---

`chrome-extension` `aws-lambda` `serverless` `dynamodb` `api-gateway` `gpt-3` `openai` `javascript` `media-bias`
