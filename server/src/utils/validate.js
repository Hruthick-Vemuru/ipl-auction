export function validatePlayingXI(players) {
  const roles = countRoles(players);
  const overseas = players.filter((p) => p.nationality === "Overseas").length;
  const wk = roles.Wicketkeeper || 0;
  const bowlersAndAllrounders =
    (roles["Bowler"] || 0) + (roles["Allrounder"] || 0);

  if (players.length !== 11) return "Playing XI must be exactly 11 players";
  if (overseas > 4) return "Max 4 overseas players allowed in Playing XI";
  if (wk < 1) return "At least 1 wicketkeeper required in Playing XI";
  if (bowlersAndAllrounders < 5)
    return "At least 5 bowlers or allrounders required in Playing XI";
  return null;
}

export function validateSquad(players, min, max) {
  const roles = countRoles(players);
  const overseas = players.filter((p) => p.nationality === "Overseas").length;
  if (players.length < min || players.length > max)
    return `Squad must be between ${min} and ${max} players`;
  if (overseas > 6) return "Max 6 overseas players allowed in Squad";
  if ((roles.Bowler || 0) < 3) return "At least 3 bowlers required in Squad";
  if ((roles.Wicketkeeper || 0) < 1)
    return "At least 1 wicketkeeper required in Squad";
  return null;
}

function countRoles(players) {
  return players.reduce((acc, p) => {
    acc[p.role] = (acc[p.role] || 0) + 1;
    return acc;
  }, {});
}
