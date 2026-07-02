document.getElementById("checkStatus").addEventListener("click", async () => {
  const res = await fetch("/api/status");
  const data = await res.json();
  document.getElementById("output").textContent = JSON.stringify(data, null, 2);
});
