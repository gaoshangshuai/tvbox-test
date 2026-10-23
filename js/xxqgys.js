const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const SITE = 'https://www.xuexi.cn';

const HEADERS = {
    'User-Agent': UA,
    'Referer': SITE + '/',
    'Origin': SITE,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9'
};

// ★★★ 静态栏目配置区 ★★★
const TAB_DATA = {
    // 特别节目 Tab 的内容
    'special': [
        {
            name: '今日说法 (2026)',
            id: '639767899891022364',
            pic: 'https://boot-img.xuexi.cn/image/1005/process/7cde786814b44d25a65ebfcd05768ab3.jpg'
        },
        {
            name: '法治深壹度',
            id: '14969337459599631464',
            pic: 'https://boot-img.xuexi.cn/image/1005/process/f8b362bde2e24f7aae3dd50cafe502c6.jpg'
        },
        {
            name: '民法典开讲了',
            id: '1740682973762424550',
            pic: 'https://boot-img.xuexi.cn/lego/image/3278_zA1sQ_WmEf/2e035ce0afb04b6ea8749ebc14a7c2be.png'
        },
        {
            name: '守护明天',
            id: '11544097259667888179',
            pic: 'https://boot-img.xuexi.cn/image/1005/process/5e3ba6ec5b6c44808ae05d9280d53d0d.jpg'
        }
    ],
    // 微短剧 Tab 的内容
    'shortplay': [
        {
            name: '换位守护',
            id: '8953930274733793710',
            pic: 'https://boot-img.xuexi.cn/image/1005/process/7b69656185a14ef1acceacf8c582f0bb.jpg'
        },
        {
            name: '宝器',
            id: '7916048991383355090',
            pic: 'https://boot-img.xuexi.cn/image/1005/process/2c8c13acee2a4a42957cfacbabd217a7.jpg'
        }
    ]
};

// ★★★ 动态栏目配置区 ★★★
const DYNAMIC_LISTS = {
    // 社会法律频道（原「法治课堂」Tab 已移除，配置保留备用）
    'society_law': 'https://www.xuexi.cn/lgdata/1lth3moi9nl.json',
    // 法律课堂频道
    'law_class': 'https://www.xuexi.cn/lgdata/v3klp6fr7l.json',
    // 社会与法频道
    'social_law_new': 'https://www.xuexi.cn/lgdata/48cdilh72vp4.json',
    // 法治微电影频道（原 Tab 已移除，内容合入微短剧）
    'law_micro_film': 'https://www.xuexi.cn/lgdata/4d82ahlubmol.json'
};

var appConfig = {
    ver: 1,
    title: '学习强国-特别节目',
    site: SITE,
    ext: {
        "landscape": true,
        "isLandscape": true
    },
    tabs: [
        { name: '特别节目', ext: { id: 'special' }, ui: 1 },
        { name: '微短剧', ext: { id: 'shortplay' }, ui: 1 },
        { name: '法律课堂', ext: { id: 'law_class' }, ui: 1 },
        { name: '社会与法', ext: { id: 'social_law_new' }, ui: 1 }
    ]
};

async function getConfig() {
    return jsonify(appConfig);
}

function safeArgsify(ext) {
    if (ext == null) return {};
    if (typeof ext === 'object') return ext;
    try {
        return argsify(ext);
    } catch (e) {
        return {};
    }
}

// 构造卡片
function makeCard(id, name, pic, remarks) {
    return {
        vod_id: id,
        vod_name: name,
        vod_pic: pic || '',
        vod_remarks: remarks || '',
        style: { type: "rect", ratio: 1.777 },
        ext: { itemId: id }
    };
}

// 取“剧名”分组键：去掉括号内容、书名号，取空格/冒号/顿号等之前的部分
function getDramaGroupKey(title) {
    if (!title) return '其他';
    let t = String(title)
        .replace(/[（(【\[][^）)】\]]*[）)】\]]/g, '')
        .replace(/[《》<>]/g, '')
        .trim();
    let m = t.match(/^(.+?)[\s:：·•—\-、,，|/]/);
    let key = m ? m[1].trim() : t;
    return key || '其他';
}

// 按剧名稳定分组：组顺序按首次出现，组内保持原顺序
function groupSpecialCards(cards) {
    const groups = new Map();
    const order = [];
    cards.forEach(c => {
        const key = getDramaGroupKey(c.vod_name);
        if (!groups.has(key)) {
            groups.set(key, []);
            order.push(key);
        }
        groups.get(key).push(c);
    });
    const sorted = [];
    order.forEach(k => sorted.push.apply(sorted, groups.get(k)));
    return sorted;
}

// 获取卡片列表
async function getCards(ext) {
    ext = safeArgsify(ext);
    let tabId = ext.id || 'special';

    let page = parseInt(ext.page || ext.pg || ext.pageNum || 1);
    if (isNaN(page) || page < 1) page = 1;

    if (page > 1) {
        return jsonify({ list: [] });
    }

    let cards = [];
    const addedIds = new Set();

    // 1) 先放静态卡片
    const shows = TAB_DATA[tabId] || [];
    shows.forEach(show => {
        addedIds.add(String(show.id));
        cards.push(makeCard(show.id, show.name, show.pic, '更新中'));
    });

    // 2) 再放动态卡片
    //    微短剧 Tab 额外加载「法治微电影」数据源
    let dynamicIds = [];
    if (DYNAMIC_LISTS[tabId]) dynamicIds.push(tabId);
    if (tabId === 'shortplay' && DYNAMIC_LISTS['law_micro_film']) dynamicIds.push('law_micro_film');

    for (let dId of dynamicIds) {
        try {
            const { data } = await $fetch.get(DYNAMIC_LISTS[dId], { headers: HEADERS });
            let listData = typeof data === 'string' ? JSON.parse(data) : data;
            if (!Array.isArray(listData)) listData = [];

            listData.forEach(item => {
                if (item.itemId && item.title && !addedIds.has(String(item.itemId))) {
                    addedIds.add(String(item.itemId));
                    const remark = item.showSource || (dId === 'law_micro_film' ? '法治微电影' : '法律课堂');
                    cards.push(makeCard(item.itemId, item.title, item.thumbImage || '', remark));
                }
            });
        } catch (e) {
            $print('获取动态列表失败(' + dId + '): ' + e.message);
        }
    }

    // 3) 特别节目 Tab：追加「社会与法」中属于中央广播电视总台的节目
    if (tabId === 'special' && DYNAMIC_LISTS['social_law_new']) {
        try {
            const { data } = await $fetch.get(DYNAMIC_LISTS['social_law_new'], { headers: HEADERS });
            let listData = typeof data === 'string' ? JSON.parse(data) : data;
            if (!Array.isArray(listData)) listData = [];

            listData.forEach(item => {
                const source = String(item.showSource || '');
                if (
                    item.itemId &&
                    item.title &&
                    source.indexOf('中央广播电视总台') !== -1 &&
                    !addedIds.has(String(item.itemId))
                ) {
                    addedIds.add(String(item.itemId));
                    cards.push(makeCard(item.itemId, item.title, item.thumbImage || '', item.showSource || '中央广播电视总台'));
                }
            });
        } catch (e) {
            $print('获取中央广播电视总台节目失败: ' + e.message);
        }

        // ★ 特别节目按剧名分组，同剧名放一起
        cards = groupSpecialCards(cards);
    }

    return jsonify({ list: cards });
}

// 获取剧集列表与直链
async function getTracks(ext) {
    ext = safeArgsify(ext);
    let itemId = ext.itemId;
    let tracks = [];

    if (!itemId) return jsonify({ list: [] });

    let jsonStr = '';
    const urls = [
        `https://article.xuexi.cn/data/app/${itemId}.js?_st=${Date.now()}`,
        `https://boot-source.xuexi.cn/data/app/${itemId}.js?_st=${Date.now()}`
    ];

    for (let url of urls) {
        try {
            const { data } = await $fetch.get(url, { headers: HEADERS });
            if (data && String(data).length > 20) {
                jsonStr = String(data);
                break;
            }
        } catch (e) {}
    }

    if (!jsonStr) {
        try {
            const pageUrl = `${SITE}/lgpage/detail/index.html?id=${itemId}`;
            const { data: html } = await $fetch.get(pageUrl, { headers: HEADERS });
            const mp4Regex = /(https?:\/\/[^"'\s]+\.(?:mp4|m3u8)[^"'\s]*)/g;
            let match;
            let count = 1;
            while ((match = mp4Regex.exec(html)) !== null) {
                let cleanUrl = match[1].replace(/\\\//g, '/');
                tracks.push({ name: `播放源 ${count++}`, pan: '', ext: { url: cleanUrl } });
            }
        } catch(e) {}
    } else {
        const start = jsonStr.indexOf('(');
        const end = jsonStr.lastIndexOf(')');
        if (start !== -1 && end !== -1) {
            jsonStr = jsonStr.substring(start + 1, end);
        }

        try {
            const detailData = argsify(jsonStr);
            let videoList = extractVideosRecursive(detailData);

            // ★ 不再颠倒，按接口返回顺序输出（通常第1集在前）
            videoList.forEach((v, i) => {
                tracks.push({
                    // 有标题用标题，否则按正序编号“第1集、第2集……”
                    name: v.title || `第${i + 1}集`,
                    pan: '',
                    ext: { url: v.url }
                });
            });
        } catch (e) {
            $print('JSON解析失败: ' + e.message);
        }
    }

    if (tracks.length === 0) {
        tracks.push({ name: '未找到视频流', pan: '', ext: { url: '' } });
    }

    return jsonify({ list: [{ title: '默认分组', tracks: tracks }] });
}

async function getPlayinfo(ext) {
    ext = safeArgsify(ext);
    let url = ext.url;
    if (!url) return jsonify({ urls: [] });

    return jsonify({
        urls: [url],
        headers: {
            'User-Agent': UA,
            'Referer': SITE + '/',
            'Origin': SITE
        }
    });
}

async function search(ext) {
    return jsonify({ list: [] });
}

// 深度递归提取视频直链
function extractVideosRecursive(node) {
    let results = [];
    if (!node || typeof node !== 'object') return results;

    if (node.video_storage_info && Array.isArray(node.video_storage_info)) {
        let bestUrl = '';
        let bestRes = -1;
        node.video_storage_info.forEach(src => {
            let url = src.normal || '';
            if (url.match(/\.(mp4|m3u8)/i)) {
                let res = parseInt(src.resolution) || 0;
                if (res > bestRes) {
                    bestRes = res;
                    bestUrl = url;
                }
            }
        });
        if (bestUrl) {
            results.push({ title: node.title || node.name || '', url: bestUrl });
        }
    }
    else if (node.videos && Array.isArray(node.videos) && node.videos.length > 0) {
        node.videos.forEach(v => {
            results = results.concat(extractVideosRecursive(v));
        });
    }

    if (node.sub_items && Array.isArray(node.sub_items)) {
        node.sub_items.forEach(sub => {
            let subList = extractVideosRecursive(sub);
            if (sub.title && subList.length > 0) {
                subList.forEach(item => {
                    if (!item.title) item.title = sub.title;
                });
            }
            results = results.concat(subList);
        });
    }

    for (let key in node) {
        if (key !== 'video_storage_info' && key !== 'videos' && key !== 'sub_items') {
            let res = extractVideosRecursive(node[key]);
            results = results.concat(res);
        }
    }

    return results;
}
