export default async function handler(req, res) {
  const { username } = req.query;

  if (!username || username.length < 3 || username.length > 16 || !/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Invalid username.' });
  }

  try {
    // Step 1: username -> UUID
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
    const uuid = profile.id;

    // Step 2: UUID -> skin texture URL (via session server)
    const sessionRes = await fetch(
      `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`
    );

    if (!sessionRes.ok) {
      return res.status(200).json({ error: 'Could not fetch skin data.' });
    }

    const session = await sessionRes.json();
    const texturesProp = session.properties?.find(p => p.name === 'textures');

    if (!texturesProp) {
      return res.status(200).json({ error: 'No texture data found.' });
    }

    // Step 3: decode base64 -> extract texture URL
    const decoded = JSON.parse(Buffer.from(texturesProp.value, 'base64').toString('utf8'));
    const skinUrl = decoded?.textures?.SKIN?.url;

    if (!skinUrl) {
      return res.status(200).json({ error: 'No skin texture found.' });
    }

    // Step 4: proxy the image (textures.minecraft.net has no CORS headers)
    const imgRes = await fetch(skinUrl);
    if (!imgRes.ok) {
      return res.status(200).json({ error: 'Could not download skin image.' });
    }

    const buffer = await imgRes.arrayBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${username}.png"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(Buffer.from(buffer));

  } catch (err) {
    return res.status(500).json({ error: 'Failed to reach Mojang API.' });
  }
}
