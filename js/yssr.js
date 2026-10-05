const cheerio = createCheerio();
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';

const SITE = 'https://vod.cctv.cn';
const LIST_MODULE_ID = 'Page1547549227742425';
const API_BASE = 'https://api.cctv.cn/childmobileinf/rest/cctv/cardgroups/share';

const HEADERS = {
    'User-Agent': UA,
    'Referer': SITE + '/',
};

let appConfig = {
    ver: 1,
    title: '央视动画',
    site: SITE,
    tabs: [
        { name: '动画片库', ext: { id: 'cctv_anim' } },
    ],
};

async function getConfig() {
    return jsonify(appConfig);
}

// ★ 安全解析 ext：兼容字符串 / 对象
function safeArgsify(ext) {
    if (ext == null) return {};
    if (typeof ext === 'object') return ext;
    try {
        return argsify(ext);
    } catch (e) {
        return {};
    }
}

// ★ 通用请求函数
async function fetchCardGroups(cardgroupId, pageSize) {
    const jsonParam = JSON.stringify({
        cardgroups: cardgroupId,
        paging: {
            page_size: pageSize || 10000,
            page_no: 1,
            last_id: ''
        }
    });
    const url = API_BASE + '?cb=fun&json=' + encodeURIComponent(jsonParam) + '&callback=__jp0';
    const { data } = await $fetch.get(url, { headers: HEADERS });
    let text = String(data);
    const start = text.indexOf('(');
    const end = text.lastIndexOf(')');
    if (start !== -1 && end !== -1) {
        text = text.substring(start + 1, end);
    }
    return argsify(text);
}

// ★ 标题归一化（去书名号、空格、标点）
function normalizeTitle(t) {
    return (t || '')
        .replace(/[《》〈〉\s\u3000·．.\-—–_:：;；,，、!！?？"'`~～]/g, '')
        .trim();
}

// ★ 提取并去重所有动画卡片
async function getAllAnimCards() {
    let cards = [];
    try {
        const json = await fetchCardGroups(LIST_MODULE_ID, 10000);

        let allItems = [];
        if (json.cardgroups) {
            json.cardgroups.forEach(group => {
                if (group.cards) {
                    allItems = allItems.concat(group.cards);
                }
            });
        }

        const seenIds = new Set();
        const seenNormTitles = new Set();

        allItems.forEach(item => {
            let id = (item.id || '').trim();
            let title = (item.title || '').trim();
            let normTitle = normalizeTitle(title);

            if (!id && !normTitle) return;
            if (id && seenIds.has(id)) return;
            if (normTitle && seenNormTitles.has(normTitle)) return;

            if (id) seenIds.add(id);
            if (normTitle) seenNormTitles.add(normTitle);

            let cover = '';
            if (item.photo && item.photo.thumb) {
                cover = item.photo.thumb;
                if (cover.indexOf('//') === 0) cover = 'https:' + cover;
                else if (cover.indexOf('http') !== 0) cover = 'https://' + cover;
            }

            cards.push({
                vod_id: id || normTitle,
                vod_name: title,
                vod_pic: cover,
                vod_remarks: item.tag || item.date || '',
                ext: { id: id },
            });
        });

        $print('央视动画去重后数量: ' + cards.length);
    } catch (e) {
        $print('获取动画列表失败: ' + e.message);
    }
    return cards;
}

// ★★★ 获取动画列表（只返回第一页）★★★
async function getCards(ext) {
    ext = safeArgsify(ext);

    let page = parseInt(ext.page || ext.pg || ext.pageNum || 1);
    if (isNaN(page) || page < 1) page = 1;

    if (page > 1) {
        $print('忽略第 ' + page + ' 页请求（央视接口不分页）');
        return jsonify({ list: [] });
    }

    let cards = await getAllAnimCards();
    return jsonify({ list: cards });
}

// ★★★ 获取剧集列表 ★★★
async function getTracks(ext) {
    ext = safeArgsify(ext);
    let id = ext.id;
    let tracks = [];

    if (!id) {
        tracks.push({ name: '缺少专辑ID', pan: '', ext: { url: '' } });
        return jsonify({ list: [{ title: '默认分组', tracks: tracks }] });
    }

    try {
        const json = await fetchCardGroups(id, 100000);

        if (json.cardgroups && json.cardgroups.length > 1) {
            const episodeGroup = json.cardgroups[1];
            if (episodeGroup.cards) {
                const seenEpIds = new Set();
                episodeGroup.cards.forEach(item => {
                    let epId = (item.id || '').trim();
                    let epName = item.title || '';

                    if (epId && seenEpIds.has(epId)) return;
                    if (epId) seenEpIds.add(epId);

                    let playUrl = '';
                    if (item.video) {
                        playUrl = item.video.url_hd || item.video.url || '';
                    }
                    if (playUrl) {
                        playUrl = playUrl.replace(/^http:/, 'https:');
                        tracks.push({ name: epName, pan: '', ext: { url: playUrl } });
                    }
                });
            }
        }

        if (tracks.length === 0) {
            tracks.push({ name: '未找到剧集', pan: '', ext: { url: '' } });
        }

    } catch (e) {
        $print('获取剧集失败: ' + e.message);
        tracks.push({ name: '获取失败', pan: '', ext: { url: '' } });
    }

    return jsonify({ list: [{ title: '默认分组', tracks: tracks }] });
}

// ★★★ 播放 ★★★
async function getPlayinfo(ext) {
    ext = safeArgsify(ext);
    let url = ext.url;
    if (!url) return jsonify({ urls: [] });
    return jsonify({
        urls: [url],
        headers: {
            'User-Agent': UA,
            'Referer': SITE + '/',
        }
    });
}

// ★★★ 搜索（兼容多种关键词参数名）★★★
async function search(ext) {
    let extObj = safeArgsify(ext);

    let wd = '';
    if (typeof ext === 'string' && ext.indexOf('{') !== 0) {
        wd = ext.trim();
    } else if (extObj) {
        wd = (extObj.wd || extObj.key || extObj.text || extObj.keyword || extObj.WD || '').toString().trim();
    }

    try {
        const decoded = decodeURIComponent(wd);
        if (decoded && decoded !== wd) wd = decoded;
    } catch (e) { }

    $print('搜索关键词: [' + wd + ']');

    if (!wd) return jsonify({ list: [] });

    let allCards = await getAllAnimCards();
    let result = allCards.filter(card => {
        return card.vod_name && card.vod_name.indexOf(wd) !== -1;
    });

    $print('搜索命中数量: ' + result.length);
    return jsonify({ list: result });
}
