const cheerio = createCheerio();
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';

const SITE = 'https://vod.cctv.cn';
const API_LIST = 'TODO: 填列表接口';
const API_DETAIL = 'TODO: 填播放接口';

const HEADERS = {
    'User-Agent': UA,
    'Referer': SITE + '/',
};

let appConfig = {
    ver: 1,
    title: '央视动画片库',
    site: SITE,
    tabs: [{ name: '热门动画', ext: { id: 'hot' } }],
};

async function getConfig() { return jsonify(appConfig); }

async function getCards(ext) {
    ext = argsify(ext);
    let cards = [];
    try {
        const { data } = await $fetch.get(API_LIST, { headers: HEADERS });
        let json = argsify(data);
        // ★ 根据实际返回结构调整
        const list = json.data || json.list || json || [];
        list.forEach(item => {
            cards.push({
                vod_id: item.id || item.guid || '',
                vod_name: item.title || '',
                vod_pic: item.image || item.pic || '',
                vod_remarks: item.brief || item.time || '',
                ext: { id: item.id || item.guid },
            });
        });
    } catch (e) { $print('列表失败: ' + e.message); }
    return jsonify({ list: cards });
}

async function getTracks(ext) {
    ext = argsify(ext);
    let tracks = [];
    try {
        const url = API_DETAIL.replace('{id}', ext.id);
        const { data } = await $fetch.get(url, { headers: HEADERS });
        let json = argsify(data);
        // ★ 根据实际返回结构调整，常见字段：hls_url / m3u8 / url
        let playUrl = json.hls_url || json.m3u8 || json.url || (json.data && json.data.url) || '';
        if (playUrl) {
            tracks.push({ name: '播放', pan: '', ext: { url: playUrl } });
        } else {
            tracks.push({ name: '未找到播放地址', pan: '', ext: { url: '' } });
        }
    } catch (e) { $print('播放失败: ' + e.message); }
    return jsonify({ list: [{ title: '默认分组', tracks }] });
}

async function getPlayinfo(ext) {
    ext = argsify(ext);
    if (!ext.url) return jsonify({ urls: [] });
    return jsonify({
        urls: [ext.url],
        headers: { 'User-Agent': UA, 'Referer': SITE + '/' }
    });
}

async function search(ext) { return jsonify({ list: [] }); }
