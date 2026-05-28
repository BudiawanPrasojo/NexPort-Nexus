
function generateAIInsight() {
  const insights = [
    "High congestion predicted at Dock C",
    "Shipment delay risk increasing",
    "Fleet overload expected in next cycle",
    "Operational traffic remains stable",
    "Heavy density detected near Port Alpha"
  ];

  const randomInsight =
    insights[Math.floor(Math.random() * insights.length)];

  const insightEl = document.getElementById("aiInsightText");

  if (insightEl) {
    insightEl.innerText = randomInsight;
  }
}

setInterval(generateAIInsight, 5000);
generateAIInsight();
