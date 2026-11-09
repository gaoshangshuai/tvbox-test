const CryptoJS = createCryptoJS();

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';

// 播放解析专用 PC UA（gslb 会校验 UA 与 splatid 的匹配，splatid=105 必须 PC UA）
const UA_PLAY = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let appConfig = {
    ver: 202611094,
    title: '乐视视频',
    site: 'https://lefun.le.com',
    tabs: [
        { name: '电影', ext: { id: '1' }, ui: 1 },
        { name: '电视剧', ext: { id: '2' }, ui: 1 },
        { name: '综艺', ext: { id: '11' }, ui: 1 },
        { name: '动漫', ext: { id: '5' }, ui: 1 },
        { name: '纪录片', ext: { id: '16' }, ui: 1 },
    ],
};

async function getConfig() { return JSON.stringify(appConfig); }

// ==================== 获取分类列表 ====================
async function getCards(ext) {
    ext = JSON.parse(ext);
    let { id, page = 1 } = ext;
    let cards = [];

    let url = `https://lefun.le.com/api/lib?pn=${page}&ps=20&cg=${id}&or=3`;
    try {
        const res = await $fetch.get(url, {
            headers: { 'User-Agent': UA, 'Referer': 'https://lefun.le.com/lib' }
        });
        let data = typeof res === 'string' ? res : (res.data || '');
        let json = JSON.parse(data);

        if (json && json.libList && json.libList.data_list) {
            json.libList.data_list.forEach(item => {
                let pic = item.pic || item.albumPic || '';
                if (pic.startsWith('http://')) pic = pic.replace('http://', 'https://');

                let remarks = item.videoStatus || item.subTitle || '';
                if (item.tag === 'VIP' && !remarks.includes('VIP')) remarks = 'VIP | ' + remarks;

                cards.push({
                    vod_id: item.vid.toString(),
                    vod_name: item.title,
                    vod_pic: pic,
                    vod_remarks: remarks,
                    ext: { id: item.vid.toString() }
                });
            });
        }
    } catch (e) {}
    return JSON.stringify({ list: cards });
}

// ==================== 详情/选集 ====================
// 官方剧集接口：https://d-api-m.le.com/card/dynamic?platform=pc&type=episode&vid=xxx&page=N
// 注意：该接口每页 100 条分页，且不带 page 参数时返回的是「传入 vid 所在的那一页」
// （超长篇动漫用最新一集的 vid 查询会只返回最后一页，如 201~238 集）。
// 因此必须从 page=1 开始循环翻页拉全集，再按集号升序排序。
function epTrackName(v, idx) {
    let raw = String(v.episode == null ? '' : v.episode).trim();
    let title = String(v.title || '').trim();

    // 1) 集号是 1~4 位纯数字：第 N 集
    if (/^\d{1,4}$/.test(raw)) {
        let n = parseInt(raw, 10);
        if (n > 0) return '第' + n + '集';
    }
    // 2) 综艺常见：标题结尾带集号（如「大话刘罗锅100」）
    let m = title.match(/(\d{1,4})\s*$/);
    if (m) return '第' + parseInt(m[1], 10) + '集';
    // 3) 日期型集号（20230501）降级为 月-日，并区分同一天的 上/中/下
    if (/^\d{8}$/.test(raw)) {
        let base = raw.slice(4, 6) + '-' + raw.slice(6, 8);
        let part = '';
        if (/[（(]上[）)]/.test(title)) part = ' 上';
        else if (/[（(]中[）)]/.test(title)) part = ' 中';
        else if (/[（(]下[）)]/.test(title)) part = ' 下';
        return base + part;
    }
    // 4) 兜底用标题
    return title.slice(0, 12) || ('第' + (idx + 1) + '集');
}

// 集号排序 key：取 episode/标题开头的前导数字，无法解析的排到最后并保持原相对顺序
function epOrderKey(v, fallbackIdx) {
    let raw = String(v.episode == null ? '' : v.episode).trim();
    let m = raw.match(/^(\d{1,4})/);
    if (!m) m = String(v.title || '').match(/^(\d{1,4})/);
    return m ? parseInt(m[1], 10) : 999999 + fallbackIdx;
}

// lefun 官方播放数据接口（lefun 网页版播放页的 SSR 数据源）
// https://lefun.le.com/api/play/{vid}
// 返回 { pageInfo, introList(含 title/总集数), episodeList{cnt,current_page,page_size,list[]}, ... }
// 特性：返回「入口 vid 所在的那一页」，每页 50 条，不响应 page 参数。
// 部分专辑（如少儿动漫）在 le.com PC 平台整体受限（card/dynamic videolist 为空，
// www.le.com 播放页 platformErr），但 lefun/h5 平台可用，且 mms 播放接口仍能出流。
async function fetchLefunPage(vid) {
    const api = `https://lefun.le.com/api/play/${vid}`;
    const res = await $fetch.get(api, {
        headers: { 'User-Agent': UA, 'Referer': 'https://lefun.le.com/' }
    });
    let raw = typeof res === 'string' ? res : (res.data || '');
    let json = JSON.parse(raw);
    const epList = (json && json.episodeList) || {};
    const intro = (json && json.introList) || {};
    const eps = [];
    (epList.list || []).forEach(v => {
        let epVid = String(v.vid || '');
        if (!epVid) return;
        eps.push({
            vid: epVid,
            episode: String(v.episode == null ? (v.porder == null ? '' : v.porder) : v.episode),
            title: String(v.nameCn || v.title || '')
        });
    });
    return {
        title: String(intro.title || ''),
        eps: eps,
        cnt: parseInt(epList.cnt, 10) || parseInt(intro.total_episode, 10) || 0,
        pageSize: parseInt(epList.page_size, 10) || 50
    };
}

// 受限专辑补页：用标题搜索拿到「最后一集 vid」（搜索结果的 videoList 预览含首尾集），
// 再以该 vid 调 lefun 接口取最后一页，与第 1 页合并（每页50，两页即可覆盖 ≤100 集的专辑）
async function fetchLefunLastPage(title) {
    try {
        const api = `https://d-api-m.le.com/search/result?wd=${encodeURIComponent(title)}`;
        const res = await $fetch.get(api, {
            headers: { 'User-Agent': UA_PLAY, 'Referer': 'https://lefun.le.com/search' }
        });
        let raw = typeof res === 'string' ? res : (res.data || '');
        let json = JSON.parse(raw);
        const list = (json && json.data && json.data.list) || [];
        for (const item of list) {
            const vl = item.videoList || [];
            if (vl.length >= 2) {
                const last = vl[vl.length - 1];
                if (last && last.vid) return String(last.vid);
            }
        }
    } catch (e) {}
    return '';
}

async function getTracks(ext) {
    ext = JSON.parse(ext);
    let vid = String(ext.id || '');
    let tracks = [];
    let merged = [];      // 所有来源合并后的剧集数据（统一形状 {vid, episode, title}）
    let seenVid = {};
    let totalCnt = 0;     // 官方元数据给出的总集数

    try {
        // 主路：card/dynamic 翻页（每页100条，绝大多数剧集/综艺可用）
        const MAX_PAGE = 10;
        for (let page = 1; page <= MAX_PAGE; page++) {
            const api = `https://d-api-m.le.com/card/dynamic?platform=pc&type=episode&vid=${vid}&page=${page}`;
            const res = await $fetch.get(api, {
                headers: {
                    'User-Agent': UA_PLAY,
                    'Referer': `https://www.le.com/ptv/vplay/${vid}.html`
                }
            });
            let raw = typeof res === 'string' ? res : (res.data || '');
            let json = JSON.parse(raw);
            let ep = json && json.data && json.data.episode;
            if (!ep || !ep.videolist || ep.videolist.length === 0) break;

            ep.videolist.forEach(v => {
                let epVid = String(v.vid || '');
                if (!epVid || seenVid[epVid]) return;
                seenVid[epVid] = 1;
                merged.push({ vid: epVid, episode: v.episode, title: v.title });
            });

            // 终止条件：已集满总数 / 本页不满一页（说明是最后一页）/ isEnd 标记
            const cnt = parseInt(ep.cnt, 10) || 0;
            const allcnt = parseInt(ep.allcnt, 10) || 0;
            // cnt 是实际收录集数；受限专辑 cnt 为 null，此时用 allcnt
            if (cnt > 0 && cnt > totalCnt) totalCnt = cnt;
            if (cnt === 0 && allcnt > totalCnt) totalCnt = allcnt;
            if (cnt > 0 && merged.length >= cnt) break;
            if (ep.videolist.length < 100) break;
            if (parseInt(ep.isEnd, 10) === 1 && cnt > 0) break;
        }

        // 兜底：card/dynamic 拿不满（平台受限专辑：videolist 为空 / 只有部分免费集）
        // → lefun /api/play/{vid} 补集（返回入口 vid 所在页，每页50条）
        if (merged.length < totalCnt || merged.length === 0) {
            try {
                const lf = await fetchLefunPage(vid);
                if (lf.eps.length > 0) {
                    if (lf.cnt > totalCnt) totalCnt = lf.cnt;
                    lf.eps.forEach(v => {
                        if (!seenVid[v.vid]) {
                            seenVid[v.vid] = 1;
                            merged.push(v);
                        }
                    });
                    // 仍不满总数 → 用标题搜索拿最后一集 vid，取最后一页合并
                    if (merged.length < totalCnt && lf.title) {
                        const lastVid = await fetchLefunLastPage(lf.title);
                        if (lastVid) {
                            const lf2 = await fetchLefunPage(lastVid);
                            lf2.eps.forEach(v => {
                                if (!seenVid[v.vid]) {
                                    seenVid[v.vid] = 1;
                                    merged.push(v);
                                }
                            });
                        }
                    }
                }
            } catch (e2) {
                console.log('lefun 补集失败: ' + e2.message);
            }
        }

        if (merged.length > 0) {
            // 按集号升序（防止接口页序/返回顺序异常导致乱序）
            const ordered = merged
                .map((v, i) => ({ v, i }))
                .sort((a, b) => (epOrderKey(a.v, a.i) - epOrderKey(b.v, b.i)) || (a.i - b.i));

            let used = {};
            ordered.forEach(({ v }, idx) => {
                let name = ordered.length === 1 ? '正片' : epTrackName(v, idx);
                // 重名兜底（同一天多集 / 标题重复）
                if (used[name]) {
                    used[name] = used[name] + 1;
                    name = name + '·' + used[name];
                } else {
                    used[name] = 1;
                }
                tracks.push({
                    name: name,
                    ext: { id: String(v.vid), url: String(v.vid) }
                });
            });
        }
    } catch (e) {
        console.log('剧集接口异常: ' + e.message);
    }

    // 彻底失败则退回单集
    if (tracks.length === 0) {
        tracks = [{ name: '正片', ext: { id: vid, url: vid } }];
    }

    return JSON.stringify({
        list: [{ title: '剧集列表', tracks: tracks }]
    });
}

// ==================== 播放解析 ====================

// 【修复1】tkey 算法（2026 现行版，旧魔数 773625421 已失效）
function getMmsKey(e) {
    const t = 0x0b074319;
    const r = t % 17;
    let n = e;
    for (let i = 0; i < r; i++) {
        let bit = n & 1;
        n = n >> 1;
        bit <<= 31;
        n += bit;
    }
    return n ^ t;
}

function genLc() {
    let s = '';
    for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
}

async function fetchPlayJson(vid, tkey, lc) {
    const params = {
        platid: 1,
        splatid: 105,
        tss: 'ios',
        id: vid,
        detect: '1',
        dvtype: '1080p',
        accessyx: 1,
        domain: 'www.le.com',
        tkey: tkey,
        source: '1001',
        lang: 'cn',
        region: 'cn',
        isHttps: 1,
    };
    const qs = Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');
    const apiUrl = `http://player-pc.le.com/mms/out/video/playJson.json?${qs}`;

    const res = await $fetch.get(apiUrl, {
        headers: {
            'User-Agent': UA_PLAY,
            'Referer': 'https://www.le.com/',
            'Cookie': `tj_lc=${lc}`
        }
    });
    return JSON.parse(typeof res === 'string' ? res : (res.data || ''));
}

function genUuid() {
    return '1' + String(Date.now()).slice(4) + String(Math.random()).slice(-6);
}

// 【修复3】gslb 调度：dispatch 地址不是可播流，必须再调度一次拿 nodelist[].location
async function fetchGslb(candUrl) {
    const gslbUrl = candUrl + '&format=1&expect=3&p1=0&p2=06&termid=2&ostype=windows&hwtype=un&uuid=' + genUuid();
    const res = await $fetch.get(gslbUrl, {
        headers: { 'User-Agent': UA_PLAY, 'Referer': 'https://www.le.com/' }
    });
    let raw = typeof res === 'string' ? res : (res.data || '');
    let json;
    try {
        json = JSON.parse(raw);
    } catch (e) {
        const m = raw.match(/\w+\(([\s\S]*)\)\s*$/);
        if (!m) throw new Error('gslb 响应无法解析');
        json = JSON.parse(m[1]);
    }
    if (json.nodelist && json.nodelist.length > 0) {
        for (const node of json.nodelist) {
            if (node.location) return node.location;
        }
    }
    throw new Error('gslb ' + (json.ercode || '') + ' ' + (json.erinfo || '无 nodelist'));
}

// 【修复2】清晰度：dispatch 的档位名不可信！
// 实测同一片源 1080p 与 350 指向完全相同的路径（vtype=21 / b=260），
// 而 720p 才是最高画质（vtype=51 / b=1011 → 1280x720）。
// 因此按 vtype 对应高度 + 码率排序，并去掉重复路径。
const VTYPE_HEIGHT = { 21: 360, 13: 540, 51: 720, 31: 1080 };

function qualityScore(path) {
    const vt = (path.match(/[?&]vtype=(\d+)/) || [])[1] || '';
    const b = parseInt((path.match(/[?&]b=(\d+)/) || [])[1] || '0', 10);
    const h = VTYPE_HEIGHT[vt] || 0;
    return h * 1000000 + b;
}

function pickPlayPaths(dispatch) {
    const seen = {};
    const list = [];
    Object.keys(dispatch || {}).forEach(key => {
        const arr = dispatch[key];
        if (!arr || !arr.length || !arr[0]) return;
        const p = arr[0];
        if (seen[p]) return;   // 1080p/350 常为同一条，去重
        seen[p] = 1;
        list.push(p);
    });
    list.sort((a, b) => qualityScore(b) - qualityScore(a));
    return list;
}

async function getPlayinfo(ext) {
    ext = JSON.parse(ext);
    const vid = ext.url;
    const lc = genLc();

    try {
        let json = await fetchPlayJson(vid, getMmsKey(Date.now() / 1000), lc);

        // 1003 = tkey 时间校验失败，用服务端 stime 重算重试（官方同款兜底）
        if (json.msgs && json.msgs.statuscode === 1003 && json.msgs.playstatus && json.msgs.playstatus.stime) {
            json = await fetchPlayJson(vid, getMmsKey(json.msgs.playstatus.stime), lc);
        }

        if (json.msgs && json.msgs.playurl && json.msgs.playurl.dispatch) {
            const pu = json.msgs.playurl;

            // domain 形如 https://https-g3.letv.com
            let domains = (pu.domain || []).map(d => {
                if (!d) return '';
                if (!/^https?:/.test(d)) d = 'https:' + d;
                return d.replace('https://https-', 'https://').replace(/\/+$/, '');
            }).filter(d => d);

            const paths = pickPlayPaths(pu.dispatch).slice(0, 3);

            for (const playPath of paths) {
                for (const domain of domains) {
                    try {
                        const finalUrl = await fetchGslb(domain + playPath);
                        if (finalUrl) {
                            return JSON.stringify({
                                urls: [finalUrl],
                                headers: [{ 'User-Agent': UA_PLAY }]
                            });
                        }
                    } catch (e2) {
                        console.log('gslb 失败: ' + e2.message);
                    }
                }
            }
        }
        throw new Error('未取到可用播放地址');
    } catch (e) {
        console.log('解析异常: ' + e.message);
        return JSON.stringify({
            urls: [`https://www.le.com/ptv/vplay/${vid}.html`],
            headers: [{ 'User-Agent': UA, 'Referer': 'https://www.le.com/' }]
        });
    }
}

// ==================== 搜索 ====================
// 官方 JSON 接口：https://d-api-m.le.com/search/result?wd=xxx
async function search(ext) {
    ext = JSON.parse(ext);
    let text = ext.text || '';
    let cards = [];

    try {
        const api = `https://d-api-m.le.com/search/result?wd=${encodeURIComponent(text)}`;
        const res = await $fetch.get(api, {
            headers: {
                'User-Agent': UA_PLAY,
                'Referer': 'https://lefun.le.com/search'
            }
        });
        let raw = typeof res === 'string' ? res : (res.data || '');
        let json = JSON.parse(raw);
        let list = (json && json.data && json.data.list) || [];

        list.forEach(item => {
            if (!item || !item.vid) return;
            let pic = item.image || '';
            if (pic.startsWith('http://')) pic = pic.replace('http://', 'https://');

            let remarks = item.channel || '';
            if (item.nowEpisodes && item.nowEpisodes > 1) remarks = '共' + item.nowEpisodes + '集';
            if (item.year) remarks = (remarks ? remarks + ' | ' : '') + item.year;

            cards.push({
                vod_id: String(item.vid),
                vod_name: item.title || '',
                vod_pic: pic,
                vod_remarks: remarks,
                ext: { id: String(item.vid) }
            });
        });
    } catch (e) {
        console.log('搜索失败: ' + e.message);
    }
    return JSON.stringify({ list: cards });
}
