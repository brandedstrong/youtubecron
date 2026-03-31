const fs = require('fs');
const path = require('path');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Search queries related to your services and audience
const SEARCH_QUERIES = [
  // Latino business / entrepreneurship
  'latino small business tips',
  'negocios latinos estados unidos',
  'emprendedor latino',
  // Contractors & home services
  'roofing business tips',
  'landscaping business grow',
  'contractor marketing tips',
  'HVAC business owner advice',
  // Branding & web
  'small business branding tips',
  'website for small business',
  'how to brand your business',
  // App & automation
  'automate small business',
  'business app for contractors',
  'AI tools small business 2026',
  // Amazon & e-commerce
  'amazon fba beginners 2026',
  'ecommerce small business',
];

async function searchYouTube(query) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&order=viewCount&maxResults=5&relevanceLanguage=en&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

async function getVideoStats(videoIds) {
  const ids = videoIds.join(',');
  const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${ids}&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.items || [];
}

async function sendTelegram(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    })
  });
}

async function main() {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
    timeZone: 'America/Los_Angeles'
  });

  console.log('Researching YouTube keywords...');

  const results = [];

  for (const query of SEARCH_QUERIES) {
    try {
      const videos = await searchYouTube(query);
      if (!videos.length) continue;

      const videoIds = videos.map(v => v.id.videoId).filter(Boolean);
      if (!videoIds.length) continue;

      const stats = await getVideoStats(videoIds);

      // Find highest view count video for this query
      let best = null;
      let maxViews = 0;
      for (const v of stats) {
        const views = parseInt(v.statistics?.viewCount || 0);
        if (views > maxViews) {
          maxViews = views;
          best = v;
        }
      }

      if (best && maxViews > 10000) {
        results.push({
          query,
          title: best.snippet.title,
          views: maxViews,
          channel: best.snippet.channelTitle,
          videoId: best.id,
          publishedAt: best.snippet.publishedAt?.split('T')[0]
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.error(`Error for "${query}":`, e.message);
    }
  }

  // Sort by view count
  results.sort((a, b) => b.views - a.views);

  // Save to file
  const outputDir = path.join(__dirname, '..', 'keywords');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputFile = path.join(outputDir, `${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

  // Build Telegram report
  if (results.length === 0) {
    await sendTelegram('📊 *YouTube Keywords* — No results today');
    return;
  }

  // Send in chunks (top 5 per message to avoid Telegram limits)
  let report = `🎬 *YouTube Keyword Research — ${date}*\n`;
  report += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  report += `_Top trending videos in your niche:_\n\n`;

  const top = results.slice(0, 8);
  for (const r of top) {
    const views = r.views >= 1000000
      ? `${(r.views / 1000000).toFixed(1)}M`
      : r.views >= 1000
      ? `${(r.views / 1000).toFixed(0)}K`
      : r.views;

    report += `🔍 *${r.query}*\n`;
    report += `📹 ${r.title.substring(0, 60)}${r.title.length > 60 ? '...' : ''}\n`;
    report += `👁 ${views} views · ${r.channel}\n`;
    report += `🔗 youtube.com/watch?v=${r.videoId}\n\n`;
  }

  // Video ideas section
  report += `━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `💡 *Video Ideas Based on Trends:*\n\n`;

  // Generate ideas from top performing queries
  const topQueries = top.slice(0, 5).map(r => r.query);
  if (topQueries.some(q => q.includes('latino'))) {
    report += `• "El secreto de los negocios latinos exitosos en USA"\n`;
  }
  if (topQueries.some(q => q.includes('roofing') || q.includes('contractor'))) {
    report += `• "Cómo hacer crecer tu negocio de construcción en USA"\n`;
  }
  if (topQueries.some(q => q.includes('branding'))) {
    report += `• "Por qué tu marca no está generando clientes (y cómo arreglarlo)"\n`;
  }
  if (topQueries.some(q => q.includes('AI') || q.includes('automate'))) {
    report += `• "Las 5 herramientas de IA que todo negocio pequeño necesita"\n`;
  }
  if (topQueries.some(q => q.includes('amazon') || q.includes('ecommerce'))) {
    report += `• "Amazon FBA para principiantes en 2026 — guía completa"\n`;
  }

  report += `\n_Data saved to GitHub · latin-branding.com_`;

  await sendTelegram(report);
  console.log(`✅ YouTube keyword report sent — ${results.length} results`);
}

main().catch(async (err) => {
  console.error('Failed:', err);
  await sendTelegram(`❌ *YouTube keywords failed*\n\`${err.message}\``).catch(() => {});
  process.exit(1);
});
