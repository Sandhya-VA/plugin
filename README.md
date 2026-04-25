# Climate Insight Tracker

Chrome extension that detects media bias in real time as you browse — powered by GPT-3.5 via AWS Lambda.

## How it works

The extension runs in the background while you search. When your session ends, it sends your search queries and clicked links to a Lambda function via API Gateway. Lambda stores the raw session in DynamoDB and runs GPT-3.5 analysis, returning a structured bias report — score, bias type (political/commercial/confirmation), flagged queries, and a recommendation for more balanced exposure. Full round trip under 200ms.

```
Chrome Extension
      |
 API Gateway
      |
 AWS Lambda
      |
  +---+---+
  |       |
DynamoDB  GPT-3.5
(session) (bias analysis)
      |
Bias report → Extension popup
```

## Stack

- **Chrome Extension** — Manifest V3, JavaScript
- **Backend** — AWS Lambda (Node.js)
- **AI** — GPT-3.5-turbo via OpenAI API
- **Database** — AWS DynamoDB
- **API** — AWS API Gateway

## Setup

**Lambda:**
```bash
cd Climate_Insight_Tracker_Backend
npm install
cp .env.example .env
# Add: AWS_REGION, DYNAMODB_TABLE_NAME, OPENAI_API_KEY
```

**Chrome Extension:**
1. Open `chrome://extensions/`
2. Enable Developer Mode
3. Load Unpacked → select `Climate_Insight_Tracker/` folder
4. Update `API_ENDPOINT` in `background.js` with your API Gateway URL

## Bias report format

```json
{
  "overallBiasScore": 6,
  "biasType": "political",
  "summary": "Search patterns show preference for sources with similar political framing",
  "flaggedQueries": ["climate policy", "energy regulation"],
  "recommendation": "Try searching with neutral terms to broaden your exposure"
}
```

`chrome-extension` `aws-lambda` `serverless` `dynamodb` `api-gateway` `gpt-3` `openai` `javascript` `media-bias`
