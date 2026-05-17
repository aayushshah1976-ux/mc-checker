export default async function handler(req, res) {
  const { username } = req.query;

  if (!username || username.length < 3 || username.length > 16 || !/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Invalid username.' });
  }

  try {
    // Step 1: username -> UUID + current name
    const profileRes = await fetch(
      `https://api.minecraftservices.com/minecraft/profile/lookup/name/${encodeURIComponent(username)}`
    );

    if (profileRes.status === 404) {
      return res.status(404).json({ error: 'Player not found.' });
    }
    if (!profileRes.ok) {
      return res.status(200).json({ error: `Mojang API error: ${profileRes.status}` });
    }

    const profile = await profileRes.json();
    const uuid    = profile.id;

    // Step 2: name history + first seen via laby.net
    let nameHistory = [];
    let firstSeen   = null;
    try {
      const labyRes = await fetch(`https://laby.net/api/v3/user/${uuid}/profile`);
      if (labyRes.ok) {
        const labyData = await labyRes.json();
        if (labyData.username_history?.length) {
          nameHistory = labyData.username_history;
        }
        if (labyData.first_join) {
          firstSeen = labyData.first_join;
        }
      }
    } catch { /* laby.net optional — skip silently */ }

    return res.status(200).json({
      uuid,
      name: profile.name,
      firstSeen,
      nameHistory,
    });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to reach Mojang API.' });
  }
}
