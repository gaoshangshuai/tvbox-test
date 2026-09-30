const cheerio = createCheerio();
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';

const API_BASE = 'https://www.yixi.tv/v3/api/site';
const SITE = 'https://www.yixi.tv';

let appConfig = {
    ver: 1,
    title: '一席',
    site: SITE,
    tabs: [
        { name: '首页', ext: { id: 'banner' } },
    ],
};

async function getConfig() {
    return jsonify(appConfig);
}

async function getCards(ext) {
    ext = argsify(ext);
    let cards = [];
    let id = ext.id || 'banner';

    let url = id === 'banner' ? `${API_BASE}/banner/` : `${API_BASE}/${id}/?page=1&page_size=12`;

    try {
        const res = await $fetch.get(url, {
            headers: { 'User-Agent': UA, 'Referer': SITE + '/' }
        });

        // 不管拿到什么，都先显示出来，方便调试
        let raw = res.data;
        if (typeof raw === 'object') {
            raw = JSON.stringify(raw);
        }
        raw = String(raw);

        // 把返回内容切成几段，每段做成一张卡片
        const chunkSize = 200;
        for (let i = 0; i < raw.length && i < 2000; i += chunkSize) {
            const chunk = raw.substring(i, i + chunkSize);
            cards.push({
                vod_id: 'debug_' + i,
                vod_name: '[' + i + '] ' + chunk,
                vod_pic: '',
                vod_remarks: '调试信息',
                ext: { id: 'debug', type: 0 },
            });
        }

        // 如果 raw 为空，也显示一张卡片
        if (cards.length === 0) {
            cards.push({
                vod_id: 'empty',
                vod_name: '返回内容为空',
                vod_pic: '',
                vod_remarks: 'URL: ' + url,
                ext: { id: 'empty', type: 0 },
            });
        }
    } catch (e) {
        // 请求失败，也显示出来
        cards.push({
            vod_id: 'error',
            vod_name: '请求失败: ' + e.message,
            vod_pic: '',
            vod_remarks: 'URL: ' + url,
            ext: { id: 'error', type: 0 },
        });
    }

    return jsonify({ list: cards });
}

async function getTracks(ext) { return jsonify({ list: [] }); }
async function getPlayinfo(ext) { return jsonify({ urls: [] }); }
async function search(ext) { return jsonify({ list: [] }); }
