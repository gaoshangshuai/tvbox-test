const cheerio = createCheerio();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const SITE = 'https://www.yixi.tv';
const API_SITE = 'https://www.yixi.tv/v3/api/site';
const API_H5 = 'https://www.yixi.tv/v3/api/h5';

const HEADERS = {
    'User-Agent': UA,
    'Referer': SITE + '/',
    'Origin': SITE,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'X-Requested-With': 'XMLHttpRequest',
};

let appConfig = {
    ver: 1,
    title: '一席调试',
    site: SITE,
    tabs: [
        { name: '演讲', ext: { id: 'speech' } },
    ],
};

async function getConfig() {
    return jsonify(appConfig);
}

async function getCards(ext) {
    ext = argsify(ext);
    let page = ext.page || 1;
    let id = ext.id || 'speech';

    const url = `${API_SITE}/${id}/?page=${page}&page_size=24`;
    
    let cards = [];
    try {
        const { data } = await $fetch.get(url, { headers: HEADERS });
        const str = String(data);
        // 把返回内容前 600 字符显示出来
        cards.push({
            vod_id: 'debug1',
            vod_name: '返回长度: ' + str.length,
            vod_pic: '',
            vod_remarks: str.substring(0, 600),
            ext: { id: 'debug', type: 0 },
        });
    } catch (e) {
        cards.push({
            vod_id: 'debug2',
            vod_name: '请求失败',
            vod_pic: '',
            vod_remarks: e.message + ' | URL: ' + url,
            ext: { id: 'debug', type: 0 },
        });
    }

    return jsonify({ list: cards });
}

async function getTracks(ext) { return jsonify({ list: [] }); }
async function getPlayinfo(ext) { return jsonify({ urls: [] }); }
async function search(ext) { return jsonify({ list: [] }); }
