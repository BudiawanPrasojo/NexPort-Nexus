
function updateHeatmapStatus() {
  const zones = document.querySelectorAll(".heat-zone");

  zones.forEach(zone => {
    const levels = ["low", "medium", "high"];
    const level = levels[Math.floor(Math.random() * levels.length)];

    zone.classList.remove("low", "medium", "high");
    zone.classList.add(level);
  });
}

setInterval(updateHeatmapStatus, 4000);
