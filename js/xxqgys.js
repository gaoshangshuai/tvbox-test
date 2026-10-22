const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const SITE = 'https://www.xuexi.cn';

const HEADERS = {
    'User-Agent': UA,
    'Referer': SITE + '/',
    'Origin': SITE,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9'
};

// ★★★ 分类数据配置区 ★★★
// 你可以根据 Tab 的 id 自由添加或调整栏目
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
        { name: '微短剧', ext: { id: 'shortplay' }, ui: 1 }
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

// 获取卡片列表
async function getCards(ext) {
    ext = safeArgsify(ext);
    let tabId = ext.id || 'special';
    
    // 处理分页，防止无限重复
    let page = parseInt(ext.page || ext.pg || ext.pageNum || 1);
    if (isNaN(page) || page < 1) page = 1;
    
    // 如果框架请求第 2 页及以后，直接返回空列表
    if (page > 1) {
        return jsonify({ list: [] });
    }

    let cards = [];
    // 根据当前 Tab 获取对应的栏目列表
    const shows = TAB_DATA[tabId] || [];
    
    shows.forEach(show => {
        cards.push({
            vod_id: show.id,
            vod_name: show.name,
            vod_pic: show.pic,
            vod_remarks: '更新中',
            style: { type: "rect", ratio: 1.777 }, // 强制横版 16:9
            ext: { itemId: show.id }
        });
    });
    
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

    // 如果接口获取失败，尝试直接从 HTML 源码提取（兜底）
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
        // 解析 JSONP 并提取数据
        const start = jsonStr.indexOf('(');
        const end = jsonStr.lastIndexOf(')');
        if (start !== -1 && end !== -1) {
            jsonStr = jsonStr.substring(start + 1, end);
        }

        try {
            const detailData = argsify(jsonStr);
            let videoList = extractVideosRecursive(detailData);
            
            // 倒序排列，最新一期在最上面
            videoList.reverse();
            
            videoList.forEach((v, i) => {
                tracks.push({
                    name: v.title || `第${videoList.length - i}集`,
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
