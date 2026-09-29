async function getPlayinfo(ext) {
    ext = argsify(ext);
    let url = ext.url;

    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } });

    let playUrl = '';

    const $ = cheerio.load(data);
    playUrl = $('video source').attr('src') || $('video').attr('src') || $('iframe').attr('src') || '';

    if (!playUrl) {
        const match = data.match(/player_aaaa\s*=\s*({[\s\S]*?})\s*<\/script>/);
        if (match) {
            try {
                const playerData = JSON.parse(match[1]);
                playUrl = playerData.url || playerData.vid || '';
            } catch (e) {
                try {
                    const fixed = match[1].replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
                    const playerData = JSON.parse(fixed);
                    playUrl = playerData.url || playerData.vid || '';
                } catch (e2) {}
            }
        }
    }

    if (!playUrl) {
        const match = data.match(/["']url["']\s*:\s*["']([^"']+)["']/);
        if (match) playUrl = match[1];
    }

    if (playUrl && playUrl.includes('%')) {
        try {
            const decoded = decodeURIComponent(playUrl);
            if (decoded.startsWith('http')) playUrl = decoded;
        } catch (e) {}
    }

    if (playUrl && !playUrl.startsWith('http') && playUrl.length > 20) {
        try {
            const decoded = Buffer.from(playUrl, 'base64').toString('utf-8');
            if (decoded.startsWith('http')) playUrl = decoded;
        } catch (e) {}
    }

    if (!playUrl) {
        const m3u8Match = data.match(/https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4|flv)[^\s"'<>]*/);
        if (m3u8Match) playUrl = m3u8Match[0];
    }

    if (playUrl && playUrl.includes('http') && playUrl.indexOf('http', 5) > 0) {
        const nestedMatch = playUrl.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/g);
        if (nestedMatch && nestedMatch.length > 1) {
            playUrl = nestedMatch[nestedMatch.length - 1];
        }
    }

    if (playUrl) {
        if (playUrl.startsWith('//')) playUrl = 'https:' + playUrl;
        else if (playUrl.startsWith('/')) playUrl = appConfig.site + playUrl;

        $print('找到播放地址: ' + playUrl);

        // ★★★ 按域名区分 headers ★★★
        let headers = {
            'User-Agent': UA
        };

        // TikTok CDN 的链接：不带 Referer，避免被拒绝
        if (playUrl.includes('tiktokcdn') || playUrl.includes('akamaized.net')) {
            headers['Referer'] = 'https://www.tiktok.com/';
        } else {
            headers['Referer'] = appConfig.site + '/';
            headers['Origin'] = appConfig.site;
        }

        return jsonify({
            urls: [playUrl],
            headers: headers
        });
    }

    $print('未找到播放地址，HTML长度: ' + data.length);
    return jsonify({ urls: [] });
}
