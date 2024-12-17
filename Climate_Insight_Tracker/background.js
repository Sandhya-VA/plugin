let trackingActive = false;
let userID = '';
let trackedTabId = null;
const formUrl = "https://forms.gle/AjCuW8zVzPuNGbEk9";
let sessionSearchActivities = [];
let rightClickedLinks = [];

// Start tracking function
function startTracking(tabId) {
    trackingActive = true;
    trackedTabId = tabId;
    sessionSearchActivities = [];
}

// Stop tracking function
function stopTracking() {
    if (!trackingActive) return;

    trackingActive = false;

    if (userID && sessionSearchActivities.length > 0) {
        const sessionData = {
            userID,
            visit_timestamp: Date.now(),
            searchActivities: sessionSearchActivities,
        };

        fetch("http://localhost:3000/storeData", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sessionData),
        }).catch(error => console.error("Error storing data:", error));
    }

    trackedTabId = null;
    rightClickedLinks = [];
}

// Ensure unique search activities
function ensureUniqueSearchActivity(searchQuery) {
    if (!sessionSearchActivities.find(activity => activity.searchQuery === searchQuery)) {
        sessionSearchActivities.push({
            searchQuery,
            resultLinks: [],
            clickedLinks: [],
        });
    }
}

// Listener for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case "setUserID":
            userID = message.userID;
            sendResponse({ status: "success" });
            break;

        case "resultLinks":
            const lastActivity = sessionSearchActivities[sessionSearchActivities.length - 1];
            if (lastActivity) {
                lastActivity.resultLinks = message.resultLinks.slice(0, 10);
            }
            break;

        case "linkClicked":
            const clickedActivity = sessionSearchActivities[sessionSearchActivities.length - 1];
            if (clickedActivity && !clickedActivity.clickedLinks.includes(message.clickedLink)) {
                clickedActivity.clickedLinks.push(message.clickedLink);
            }
            break;

        case "linkRightClicked":
            if (!rightClickedLinks.includes(message.clickedLink)) {
                rightClickedLinks.push(message.clickedLink);
            }
            break;

        default:
            break;
    }
    return true;
});

// Capture search activity on completed navigation
chrome.webNavigation.onCompleted.addListener((details) => {
    if (trackingActive && details.tabId !== trackedTabId && details.url.includes("https://www.google.com/search")) {
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

// Monitor new tab events
chrome.tabs.onCreated.addListener((tab) => {
    const lastRightClickedLink = rightClickedLinks.pop();
    if (lastRightClickedLink) {
        const lastActivity = sessionSearchActivities[sessionSearchActivities.length - 1];
        if (lastActivity && !lastActivity.clickedLinks.includes(lastRightClickedLink)) {
            lastActivity.clickedLinks.push(lastRightClickedLink);
        }
    }
});

// Monitor tab updates to start/stop tracking
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        if (tab.url.includes(formUrl) && userID && !trackingActive) {
            startTracking(tabId);
        } else if (trackingActive && tabId === trackedTabId && !tab.url.includes(formUrl)) {
            stopTracking();
        }
    }
});

// Stop tracking if the form tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    if (trackingActive && tabId === trackedTabId) {
        stopTracking();
    }
});
