const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
const SITE = 'https://tv.chinacourt.cn';

let appConfig = {
    ver: 4,
    title: '法院网',
    site: SITE,
    tabs: [{ name: '合作栏目', ext: { type: 'list', url: '/shipin-22.html' }, ui: 1 }]
};

async function getConfig() { return jsonify(appConfig); }

function safeArgsify(ext) {
    if (ext == null) return {};
    if (typeof ext === 'object') return ext;
    try { return argsify(ext); } catch (e) { return {}; }
}

// 1. 获取列表
async function getCards(ext) {
    ext = safeArgsify(ext);
    let page = ext.page || 1;
    let pageUrl = page === 1 ? SITE + ext.url : SITE + ext.url + '?page=' + page;
    let cards = [];
    
    try {
        const { data: html } = await $fetch.get(pageUrl, {
            headers: { 'User-Agent': UA, 'Referer': SITE + '/' }
        });
        let text = String(html);
        
        // 简单粗暴的正则
        let regex = /<a target="_blank" title="([^"]+)" href="(\/\d+\.html)"><img[^>]*src="([^"]+)"/g;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            let vodName = match[1];
            let vodUrl = match[2];
            let vodPic = match[3];
            
            let vodId = vodUrl.replace('.html', '').replace('/', '');

            cards.push({
                vod_id: vodId,
                vod_name: vodName,
                vod_pic: vodPic.indexOf('http') === 0 ? vodPic : SITE + vodPic,
                vod_remarks: '视频',
                ext: { type: 'detail', url: SITE + vodUrl }
            });
        }
    } catch (e) {}
    
    return jsonify({ list: cards });
}

// 2. 获取详情
async function getTracks(ext) {
    ext = safeArgsify(ext);
    let vodUrl = ext.url;
    let tracks = [];

    try {
        const { data: html } = await $fetch.get(vodUrl, {
            headers: { 'User-Agent': UA, 'Referer': SITE + '/' }
        });
        let text = String(html);
        
        // 提取 m3u8
        let m3u8Match = text.match(/(https?:\/\/[^"'\s]+?\.m3u8[^"'\s]*)/i);
        
        if (m3u8Match && m3u8Match[1]) {
            tracks.push({
                name: '正片',
                pan: '',
                ext: { url: m3u8Match[1] }
            });
        }
    } catch (e) {}

    if (tracks.length === 0) {
        tracks.push({ name: '未找到源', pan: '', ext: { url: '' } });
    }

    return jsonify({ list: [{ title: '剧集列表', tracks: tracks }] });
}

// 3. 播放
async function getPlayinfo(ext) {
    ext = safeArgsify(ext);
    let url = ext.url;
    if (!url) return jsonify({ urls: [] });

    return jsonify({
        urls: [url],
        headers: { 'User-Agent': UA, 'Referer': SITE + '/' }
    });
}
