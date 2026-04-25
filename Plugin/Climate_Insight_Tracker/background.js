let trackingActive = false;
let userID = '';
let trackedTabId = null;
let sessionSearchActivities = [];
let rightClickedLinks = [];

// Replace with your deployed API Gateway endpoint
const API_ENDPOINT = "https://your-api-gateway-url.amazonaws.com/prod";

function startTracking(tabId) {
    trackingActive = true;
    trackedTabId = tabId;
    sessionSearchActivities = [];
}

function stopTracking() {
    if (!trackingActive) return;
    trackingActive = false;

    if (userID && sessionSearchActivities.length > 0) {
        const sessionData = {
            userID,
            visit_timestamp: Date.now(),
            searchActivities: sessionSearchActivities,
        };

        // Send to Lambda — stores in DynamoDB and runs bias analysis via GPT
        fetch(`${API_ENDPOINT}/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sessionData),
        })
        .then(res => res.json())
        .then(data => {
            if (data.biasReport) {
                // Store bias report locally so popup can display it
                chrome.storage.local.set({ lastBiasReport: data.biasReport });
            }
        })
        .catch(err => console.error("Error sending session data:", err));
    }

    trackedTabId = null;
    rightClickedLinks = [];
}

function ensureUniqueSearchActivity(searchQuery) {
    if (!sessionSearchActivities.find(a => a.searchQuery === searchQuery)) {
        sessionSearchActivities.push({ searchQuery, resultLinks: [], clickedLinks: [] });
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case "setUserID":
            userID = message.userID;
            sendResponse({ status: "success" });
            break;
        case "resultLinks":
            const last = sessionSearchActivities[sessionSearchActivities.length - 1];
            if (last) last.resultLinks = message.resultLinks.slice(0, 10);
            break;
        case "linkClicked":
            const clicked = sessionSearchActivities[sessionSearchActivities.length - 1];
            if (clicked && !clicked.clickedLinks.includes(message.clickedLink)) {
                clicked.clickedLinks.push(message.clickedLink);
            }
            break;
        case "linkRightClicked":
            if (!rightClickedLinks.includes(message.clickedLink)) {
                rightClickedLinks.push(message.clickedLink);
            }
            break;
        case "getBiasReport":
            chrome.storage.local.get("lastBiasReport", (result) => {
                sendResponse({ report: result.lastBiasReport || null });
            });
            return true;
        default:
            break;
    }
    return true;
});

chrome.webNavigation.onCompleted.addListener((details) => {
    if (trackingActive && details.url.includes("https://www.google.com/search")) {
        const searchQuery = new URL(details.url).searchParams.get('q');
        if (searchQuery) {
            ensureUniqueSearchActivity(searchQuery);
            chrome.scripting.executeScript({
                target: { tabId: details.tabId },
                files: ["content.js"],
            });
        }
    }
}, { url: [{ urlMatches: 'https://www.google.com/search' }] });

chrome.tabs.onCreated.addListener(() => {
    const lastLink = rightClickedLinks.pop();
    if (lastLink) {
        const last = sessionSearchActivities[sessionSearchActivities.length - 1];
        if (last && !last.clickedLinks.includes(lastLink)) {
            last.clickedLinks.push(lastLink);
        }
    }
});

const FORM_URL = "https://forms.gle/AjCuW8zVzPuNGbEk9";

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        if (tab.url.includes(FORM_URL) && userID && !trackingActive) {
            startTracking(tabId);
        } else if (trackingActive && tabId === trackedTabId && !tab.url.includes(FORM_URL)) {
            stopTracking();
        }
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    if (trackingActive && tabId === trackedTabId) stopTracking();
});
