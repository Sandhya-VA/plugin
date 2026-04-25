(() => {
    const monitoredLinks = new Set();

    function captureResultLinks() {
        const resultLinks = Array.from(document.querySelectorAll('a'))
            .map((link, index) => ({
                rank: index + 1,
                title: link.innerText.trim() || "N/A",
                description: link.getAttribute("aria-label") || "N/A",
                url: link.href,
            }))
            .filter(link =>
                link.title !== "N/A" &&
                link.url.startsWith("http") &&
                !link.url.includes("google.com")
            )
            .slice(0, 10);

        chrome.runtime.sendMessage({ type: "resultLinks", resultLinks });
    }

    function monitorLinkClicks() {
        const links = document.querySelectorAll('a');
        links.forEach(link => {
            if (!monitoredLinks.has(link.href) && link.href.startsWith("http") && !link.href.includes("google.com")) {
                monitoredLinks.add(link.href);

                link.addEventListener('click', () => {
                    chrome.runtime.sendMessage({ type: "linkClicked", clickedLink: link.href });
                });

                link.addEventListener('contextmenu', () => {
                    chrome.runtime.sendMessage({ type: "linkRightClicked", clickedLink: link.href });
                });
            }
        });
    }

    const observer = new MutationObserver(() => {
        captureResultLinks();
        monitorLinkClicks();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    captureResultLinks();
    monitorLinkClicks();
})();
