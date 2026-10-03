const cheerio = createCheerio();

const SITE = 'https://www.yixi.tv';
const API_SITE = 'https://www.yixi.tv/v3/api/site';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 13_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/87.0.4280.77 Mobile/15E148 Safari/604.1',
    'Referer': SITE + '/',
    'Origin': SITE,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Authcode': '$yf&cpup8d%@s2h%',
    'Cookie': 'Hm_lvt_889adc48ccf05684181736d6e2e31ed4=1790986893; Hm_lpvt_889adc48ccf05684181736d6e2e31ed4=1790986893; HMACCOUNT=9F8659EE0B2375FA',
};

let appConfig = {
    ver: 1,
    title: '一席调试2',
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

    const url = `${API_SITE}/${id}/?page=${page}&page_size=8&category_id=&order_by=0`;
    
    let cards = [];
    try {
        const { data } = await $fetch.get(url, { headers: HEADERS });
        const json = argsify(data);
        
        // 显示顶层 keys
        const topKeys = Object.keys(json || {}).join(',');
        
        // 显示 data 层的 keys
        const dataKeys = json?.data ? Object.keys(json.data).join(',') : '无data';
        
        // 尝试找到数组字段
        let arrayInfo = '未找到数组';
        if (json?.data) {
            for (let k in json.data) {
                if (Array.isArray(json.data[k])) {
                    arrayInfo = 'data.' + k + ' 长度=' + json.data[k].length;
                    break;
                }
            }
        }
        
        cards.push({
            vod_id: 'debug1',
            vod_name: '顶层keys: ' + topKeys,
            vod_pic: '',
            vod_remarks: 'data的keys: ' + dataKeys,
            ext: { id: 'debug', type: 0 },
        });
        
        cards.push({
            vod_id: 'debug2',
            vod_name: '数组信息: ' + arrayInfo,
            vod_pic: '',
            vod_remarks: 'error_code: ' + json?.error_code + ', msg: ' + json?.error_msg,
            ext: { id: 'debug', type: 0 },
        });
        
    } catch (e) {
        cards.push({
            vod_id: 'debug3',
            vod_name: '请求失败',
            vod_pic: '',
            vod_remarks: e.message,
            ext: { id: 'debug', type: 0 },
        });
    }

    return jsonify({ list: cards });
}

async function getTracks(ext) { return jsonify({ list: [] }); }
async function getPlayinfo(ext) { return jsonify({ urls: [] }); }
async function search(ext) { return jsonify({ list: [] }); }
