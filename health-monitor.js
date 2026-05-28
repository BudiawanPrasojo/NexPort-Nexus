
function updateSystemHealth() {
  const latency = Math.floor(Math.random() * 120) + 20;
  const sessions = Math.floor(Math.random() * 12) + 3;

  const latencyEl = document.getElementById("latencyValue");
  const sessionsEl = document.getElementById("activeSessions");
  const realtimeEl = document.getElementById("realtimeStatus");
  const systemEl = document.getElementById("systemStatus");

  if (!latencyEl || !sessionsEl || !realtimeEl || !systemEl) return;

  latencyEl.innerText = latency + "ms";
  sessionsEl.innerText = sessions;

  realtimeEl.innerText = latency < 100 ? "Connected" : "Unstable";
  systemEl.innerText = latency < 100 ? "Healthy" : "Warning";
}

setInterval(updateSystemHealth, 4000);
updateSystemHealth();
