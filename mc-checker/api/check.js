export default async function handler(req, res) {
  const { username } = req.query;

  if (!username || username.length < 3 || username.length > 16 || !/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Invalid username.' });
  }

  try {
    const response = await fetch(
      `https://api.minecraftservices.com/minecraft/profile/lookup/name/${encodeURIComponent(username)}`
    );

    if (response.status === 200) {
      return res.status(200).json({ available: false });
    } else if (response.status === 404) {
      return res.status(200).json({ available: true });
    } else {
      return res.status(200).json({ error: `Unexpected response: ${response.status}` });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reach Mojang API.' });
  }
}
