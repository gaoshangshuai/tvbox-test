const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
const SITE = 'https://tv.chinacourt.cn';

let appConfig = {
    ver: 4,
    title: '中国法院网',
    site: SITE,
    tabs: [
        { name: '合作栏目', ext: { type: 'list', url: '/shipin-22.html' }, ui: 1 }
    ]
};

async function getConfig() { return jsonify(appConfig); }

function safeArgsify(ext) {
    if (ext == null) return {};
    if (typeof ext === 'object') return ext;
    try { return argsify(ext); } catch (e) { return {}; }
}

// ==================== 1. 获取列表（解析 HTML） ====================
async function getCards(ext) {
    ext = safeArgsify(ext);
    let page = ext.page || 1;
    let basePath = ext.url;
    
    // 拼接分页地址
    let pageUrl = page === 1 ? SITE + basePath : `${SITE}${basePath}?page=${page}`;
    
    let cards = [];
    try {
        const { data: html } = await $fetch.get(pageUrl, {
            headers: { 'User-Agent': UA, 'Referer': SITE + '/' }
        });
        let text = String(html);
        
        // 核心：用正则提取列表项。
        // 匹配：<a href="/70491.html" ... title="标题"> <img src="图片">
        let regex = /<a[^>]*href="(\/\d+\.html)"[^>]*title="([^"]+)">[\s\S]*?<img[^>]*src="([^"]+)"/g;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            let vodUrl = match[1];
            let vodName = match[2];
            let vodPic = match[3];

            // 补全相对路径
            if (vodUrl && !vodUrl.startsWith('http')) {
                vodUrl = SITE + vodUrl;
            }
            if (vodPic && !vodPic.startsWith('http')) {
                vodPic = SITE + vodPic;
            }

            // 提取 ID (如 /70491.html -> 70491)
            let idMatch = vodUrl.match(/\/(\d+)\.html/);
            let vodId = idMatch ? idMatch[1] : vodUrl;

            cards.push({
                vod_id: vodId,
                vod_name: vodName,
                vod_pic: vodPic,
                vod_remarks: '点击播放',
                ext: { type: 'detail', id: vodId, url: vodUrl }
            });
        }
    } catch (e) {
        console.log('解析列表失败: ' + e.message);
    }
    
    return jsonify({ list: cards });
}

// ==================== 2. 获取详情和播放地址 ====================
async function getTracks(ext) {
    ext = safeArgsify(ext);
    let vodUrl = ext.url;
    if (!vodUrl) return jsonify({ list: [] });

    let tracks = [];
    try {
        // 请求详情页 HTML
        const { data: html } = await $fetch.get(vodUrl, {
            headers: { 'User-Agent': UA, 'Referer': SITE + '/' }
        });
        let text = String(html);
        
        // 从详情页源码中硬抠出 m3u8 链接
        // 根据你的抓包，m3u8 链接特征非常明显：https://newmedia3.chinacourt.cn/.../v.xxx.m3u8
        let videoMatch = text.match(/(https?:\/\/[^"'\s]+?\.m3u8[^"'\s]*)/i);
        
        if (videoMatch && videoMatch[1]) {
            tracks.push({
                name: '正片',
                pan: '',
                ext: { url: videoMatch[1] }
            });
        }
    } catch (e) {
        console.log('解析详情页失败: ' + e.message);
    }

    if (tracks.length === 0) {
        tracks.push({ name: '暂未找到视频源', pan: '', ext: { url: '' } });
    }

    return jsonify({ list: [{ title: '视频列表', tracks: tracks }] });
}

// ==================== 3. 播放（直链播放，附防拦截请求头） ====================
async function getPlayinfo(ext) {
    ext = safeArgsify(ext);
    let url = ext.url;
    if (!url) return jsonify({ urls: [] });

    // 直接把提取出的 m3u8 链接丢给播放器。
    // 带上 Referer，破掉腾讯云 CDN 的防盗链，让播放器能顺利拉到 .ts 切片。
    return jsonify({
        urls: [url],
        headers: { 
            'User-Agent': UA, 
            'Referer': SITE + '/' 
        }
    });
}
