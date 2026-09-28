const cheerio = createCheerio();
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';

let appConfig = {
    ver: 1,
    title: '233动漫',
    site: 'https://www.233dm.com',
    tabs: [
        { name: '日漫', ext: { id: '1' } },
        { name: '国漫', ext: { id: '2' } },
        { name: '动画', ext: { id: '5' } },
        { name: '剧场', ext: { id: '24' } },
        { name: '特摄', ext: { id: '4' } },
        { name: '美漫', ext: { id: '3' } },
    ],
};

async function getConfig() {
    return jsonify(appConfig);
}

async function getCards(ext) {
    ext = argsify(ext);
    let cards = [];
    let { id, page = 1 } = ext;

    const url = `${appConfig.site}/type/${id}-${page}.html`;
    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } });
    const $ = cheerio.load(data);

    $('.public-list-box, .module-item').each((_, element) => {
        const href = $(element).find('a').attr('href');
        const title = $(element).find('a').attr('title') || $(element).find('.public-list-title, .module-item-title').text().trim();
        const cover = $(element).find('img').attr('data-src') || $(element).find('img').attr('src');
        const remark = $(element).find('.public-list-prb, .module-item-note').text().trim();

        if (href && title) {
            cards.push({
                vod_id: href,
                vod_name: title,
                vod_pic: cover,
                vod_remarks: remark,
                ext: { url: `${appConfig.site}${href}` },
            });
        }
    });

    return jsonify({ list: cards });
}

async function getTracks(ext) {
    ext = argsify(ext);
    let url = ext.url;
    let tracks = [];

    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } });
    const $ = cheerio.load(data);

    // 尝试多种常见播放列表选择器
    const playlistSelectors = [
        '.module-play-list a',
        '.play-list a',
        '.playlist a',
        '.content-playlist a',
    ];

    for (const selector of playlistSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
            elements.each((_, element) => {
                const name = $(element).text().trim();
                const playUrl = $(element).attr('href');
                if (name && playUrl) {
                    tracks.push({
                        name: name,
                        pan: '',
                        ext: { url: `${appConfig.site}${playUrl}` },
                    });
                }
            });
            break; // 找到有效选择器后停止
        }
    }

    // 如果没找到剧集列表，当作电影处理
    if (tracks.length === 0) {
        tracks.push({
            name: '播放',
            pan: '',
            ext: { url: url },
        });
    }

    return jsonify({
        list: [{ title: '默认分组', tracks }],
    });
}

async function getPlayinfo(ext) {
    ext = argsify(ext);
    let url = ext.url;

    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } });
    const $ = cheerio.load(data);

    // 方法1：直接找 video 标签
    let playUrl = $('video source').attr('src') || $('video').attr('src');

    // 方法2：查找 player_aaaa 变量
    if (!playUrl) {
        const match = data.match(/player_aaaa\s*=\s*({[^}]+})/);
        if (match) {
            try {
                const playerData = JSON.parse(match[1]);
                playUrl = playerData.url;
            } catch (e) {
                // ignore
            }
        }
    }

    // 方法3：查找 m3u8 链接
    if (!playUrl) {
        const m3u8Match = data.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
        if (m3u8Match) {
            playUrl = m3u8Match[0];
        }
    }

    if (playUrl) {
        return jsonify({ urls: [playUrl] });
    }

    return jsonify({ urls: [] });
}

async function search(ext) {
    ext = argsify(ext);
    let cards = [];
    let text = encodeURIComponent(ext.text);
    let page = ext.page || 1;

    const url = `${appConfig.site}/vodsearch/${text}----------${page}---.html`;
    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } });
    const $ = cheerio.load(data);

    $('.public-list-box, .module-search-item').each((_, element) => {
        const href = $(element).find('a').attr('href');
        const title = $(element).find('a').attr('title') || $(element).find('.public-list-title, .module-item-title').text().trim();
        const cover = $(element).find('img').attr('data-src') || $(element).find('img').attr('src');
        const remark = $(element).find('.public-list-prb, .module-item-note').text().trim();

        if (href && title) {
            cards.push({
                vod_id: href,
                vod_name: title,
                vod_pic: cover,
                vod_remarks: remark,
                ext: { url: `${appConfig.site}${href}` },
            });
        }
    });

    return jsonify({ list: cards });
}
