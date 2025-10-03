document.getElementById("numPlayers").addEventListener("input", function() {
  const count = this.value;
  const container = document.getElementById("playersInput");
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    container.innerHTML += `<input type="text" placeholder="Player ${i+1} Name" required><br>`;
  }
});

document.getElementById("teamForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  const teamName = document.getElementById("teamName").value;
  const playerInputs = document.querySelectorAll("#playersInput input");
  const players = Array.from(playerInputs).map(input => input.value);

  const res = await fetch("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamName, players })
  });
  const data = await res.json();
  alert(data.message);
  this.reset();
});

async function loadMatches() {
  const res = await fetch("/matches");
  const matches = await res.json();
  const container = document.getElementById("matchList");
  container.innerHTML = "";
  matches.forEach(match => {
    if (match[1] === "BYE") {
      container.innerHTML += `<p>🎉 ${match[0].teamName} gets a BYE! 🎉</p>`;
    } else {
      container.innerHTML += `<p>${match[0].teamName} 🆚 ${match[1].teamName}</p>`;
    }
  });
}

async function updateWinner() {
  const winnerId = document.getElementById("winnerId").value;
  const loserId = document.getElementById("loserId").value;
  const res = await fetch("/winner", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ winnerId, loserId })
  });
  const data = await res.json();
  alert(data.message);
}
