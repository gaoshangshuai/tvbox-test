const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
const SITE = 'https://content-static.cctvnews.cctv.com';

// =====================================================================
// ★★★ 核心数据包：已精简掉 cover/item_id/desc，仅保留标题和播放链接 ★★★
// =====================================================================
const LOCAL_VIDEOS = [
    { title: "20260930 旧案追查", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/09/30/155484517469074637238011005/15ec9ef7487d4081898fb784d69fc322-4.m3u8" },
{ title: "20260929 恶意下单的代价", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/09/29/155448311747471360338011005/18b1c6ec9a9f435980a005da4f642cea-4.m3u8" },
{ title: "20260924 警惕“偶像签名”陷阱", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/09/24/155267081171982746093011005/727efc6246984f329ef1a6a5a469dc03-4.m3u8" },
{ title: "20260923 跨境追毒", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/09/23/155230706100742553973011005/5042c71e2be84607847d5f408fa4b061-4.m3u8" },
{ title: "20260922 骗保链条覆灭记", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/09/22/155194549913441485207011005/a5191c7597644ec99d248bd1a3113c02-4.m3u8" },
{ title: "20260921 舆情敲诈需严惩", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/09/21/155158473508939776238011005/897a473655e74055ac337785110822aa-4.m3u8" },
{ title: "20260918 青藏铁路全线通车二十周年特别策划 护卫“天路”·呵护高原生灵", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/09/18/155049741696604979638011005/ecbb50eaad3248fd9207ec0ef7f5e46b-4.m3u8" },
{ title: "20260917 青藏铁路全线通车二十周年特别策划 护卫“天路”·千里巡护通途", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/09/17/155013428677165875573011005/b25ceb976a37405281a1f01bb2c7d6fc-4.m3u8" },
{ title: "20260916 青藏铁路全线通车二十周年特别策划 护卫“天路”·雪域生命接力", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/09/16/154977557895902822873011005/592abfff447d4ea8852c9c357b6bd9a1-4.m3u8" },
{ title: "20260915 邻里泄愤的代价", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/09/15/154941145206358426038011005/f4be40b730c747339ad7af61122cb30f-4.m3u8" },
{ title: "20260914 空宅连环盗窃案", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/09/14/154904967305583002093011005/984a757744584420b4914b9dfb2ee645-4.m3u8" },
{ title: "20260911 斩断非法捕捞链", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/09/11/154795986813382246844011005/7b0a7da02dcf4f1fb3ccdc252856771a-4.m3u8" },
{ title: "20260910 “游戏礼包”里隐藏的诈骗", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/09/10/154759995822940570007011005/5fcffe6cffb345ee9b11818dd45bb81d-4.m3u8" },
{ title: "20260909 虚假养殖集资骗局", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/09/09/154723865803917312444011005/c21ae867851d4e94b0ac2c2ca6c84bd3-4.m3u8" },
{ title: "20260907 工伤造假骗保案", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/09/07/154650959628714803673011005/4043a4382e21409d90c7dc07f8d7a9b1-4.m3u8" },
{ title: "20260904 斩断盗墓黑手", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/09/04/154542542788467507638011005/17467905f58e465d8d51f8287b42cb2a-4.m3u8" },
{ title: "20260903 边境密林的缉捕", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/09/03/154506662640492954044011005/7d83927a29234b519d196a81ee670b62-4.m3u8" },
{ title: "20260902 重组家庭的遗嘱之争", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/09/02/154470099791931392438011005/0c9c96dd7b4c4cbdba38c096058a931f-4.m3u8" },
{ title: "20260901 折扣票牵出洗钱大案", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/09/01/154433479173560730093011005/24949b2216604060af800020bedbed0f-4.m3u8" },
    { title: "九年缉逃", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/08/31/154397818126372864418011005/a9f8235a53534d14bc833bfee53def65-4.m3u8" },
    { title: "暑期特别策划 司法护航迷途少年", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/08/28/154288990847904154073011005/aacc7cf6b4964d5a877d5a14e994d1c3-4.m3u8" },
    { title: "暑期特别策划 养育不该有伤害", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/08/26/154216214722546893293011005/58fa859c0a3a466fb1ab2bda47ddec4f-4.m3u8" },
    { title: "缉拿海上偷捕", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/08/25/154179989516305203518011005/5dc44022b82a48feb1efe04dd66389b7-4.m3u8" },
    { title: "追逃二十六年", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/08/24/154143632665110528438011005/e01888f00f5b4e52907a5f336d72e321-4.m3u8" },
    { title: "逃避执行终落空", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/08/21/154034794981841306093011005/d8853aee19974a3997693ed54b1bcd15-4.m3u8" },
    { title: "风灾敲响避险警钟", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/08/20/153998522425262899518011005/27e72d414a0e4f5c9821dce71acd836a-4.m3u8" },
    { title: "追踪野味交易", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/08/19/153962419235088384438011005/e868a0b4d0164835991c415a85cda678-4.m3u8" },
    { title: "诱人低价藏陷阱", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/08/18/153926270949874893218011005/fa4e585d9402439e8ddcf516a5845035-4.m3u8" },
    { title: "跨越三十年的追捕", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/08/17/153890297145180979618011005/158ce92185964baa861e6399cb5ab0ba-4.m3u8" },
    { title: "非法穿越需担责", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/08/14/153781160682334618073011005/6c04262b82204932afdc779fd6726f52-4.m3u8" },
    { title: "被藏匿的保险柜", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/08/13/153744972161571226093011005/a5fdae6f907b426288609fb0199da3e9-4.m3u8" },
    { title: "艾草外衣下的传销", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/08/12/153709021410440397238011005/78f9f78c3ee04d7881022c986a685dbb-4.m3u8" },
    { title: "伪装的“高速剐蹭”", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/08/11/153672917251401318893011005/6b3bf5e7884c48c4bac28e76c7b1a2a5-4.m3u8" },
    { title: "警惕“红包”洗钱犯罪", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/08/10/153636774395704934818011005/d003a7edaa184df599befa7fc8e80dfc-4.m3u8" },
    { title: "“追损”为名的圈套", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/08/07/153527578309149491518011005/b85957cd6b1f4f9cb10cc66d0a4ac5b4-4.m3u8" },
    { title: "车贷骗局", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/08/06/153491658428096922007011005/cc0ff81eb9ca40898ad21b4f3d2520fc-4.m3u8" },
    { title: "替父顶罪的代价", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/08/05/153455638158064435607011005/7cc8565109b24504a1227535bb05717a-4.m3u8" },
    { title: "保单的时效之争", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/08/04/153419444297531802038011005/510fb85c5ded4b5eacfb605ab3d09d39-4.m3u8" },
    { title: "直播间的“爱心陷阱”", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/08/03/153382786577179443603011005/bef9dbee5eff451181b3edbbdaef41dd-4.m3u8" },
    { title: "卡片背后的非法放贷网", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/31/153273917744063283603011005/bc6549b64f9547ddbd96a5962b7a6f2b-4.m3u8" },
    { title: "虚构诊疗的医保骗局", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/30/153238154021154406474011005/694c2b775ce34b1ab8e1328e58ac0acb-4.m3u8" },
    { title: "连环车祸谁担责", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/29/153201710446023885274011005/8c13bb202402497ebded622825665d4d-4.m3u8" },
    { title: "破解收养司法僵局", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/28/153165213192190362091011005/1d817664f9184c99b3800890ef997241-4.m3u8" },
    { title: "“天价粮票”代拍陷阱", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/27/153129041474236826058011005/99cccec735d844708960d120a2a56829-4.m3u8" },
    { title: "谁抢走了专家号", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/24/153020827222231450081011005/384dedef42a94c8e9e93302a91a7d57e-4.m3u8" },
    { title: "专坑老人的“收藏局”", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/23/152984346553932186029011005/78cd8af0f5bd48548b0362983f574c4e-4.m3u8" },
    { title: "古村老宅失窃案", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/22/152947769510185779541011005/4bf5ead1c4e24031bd841818b3414b75-4.m3u8" },
    { title: "蹊跷的头皮诊疗", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/21/152911905348785766681011005/d32f2e76113e41169e1acc48adabf697-4.m3u8" },
    { title: "“低价游”的隐秘圈套", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/20/152875273577758310841011005/e3a9de51b87d424d975dc3f9e9f51b5b-4.m3u8" },
    { title: "阻断购金洗钱链", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/17/152766969622177792412011005/fa8e332b8d4140668b7d725304a56265-4.m3u8" },
    { title: "揭秘“网恋诈骗”套路（下）", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/16/152730853247214387681011005/9d227f2e749540328c25700a804931b3-4.m3u8" },
    { title: "揭秘“网恋诈骗”套路（上）", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/15/152694271023490662829011005/23fae06dbf7c4bb997233ad33551d935-4.m3u8" },
    { title: "盗墓求财终获刑", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/14/152657903280120627681011005/b1da6bdd101b44e695a2e30e639a1371-4.m3u8" },
    { title: "“贷款”有诈", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/13/152621747161195315667011005/01edca63aa5a4856b69985a258647e30-4.m3u8" },
    { title: "接力追查二十三年", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/10/152513263466688512381011005/e711e972053448799b07c75136d34d74-4.m3u8" },
    { title: "斩断涉诈“网关黑链”", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/09/152476620605080371696011005/7e85fe177ccc4462ac0bc4420aa38f8f-4.m3u8" },
    { title: "捣毁新型制毒窝点", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/08/152440692960379289912011005/82a8b0ecd75f45bca6536a07104791fa-4.m3u8" },
    { title: "假协议难逃真罪责", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/07/152404302177275494812011005/679466764a7140f990b872bb671c577d-4.m3u8" },
    { title: "来自“身边人”的骗局", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/06/152368209324814746041011005/d1c8fda81de1484fb4ba4bf4da9c2fe3-4.m3u8" },
    { title: "追缉午夜窃贼", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/03/152259625199373926812011005/da2b93e966954a3185ce9b07d4d4c499-4.m3u8" },
    { title: "继亲赡养之争", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/02/152223285222289408281011005/6eb5a2a92c56413eb88a5e79b5add9b2-4.m3u8" },
    { title: "铁路线上的救助", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/07/01/152187576294191513941011005/fabd44dde3e347babdfc489559c816d6-4.m3u8" },
    { title: "无人机下的非法捕猎", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/06/30/152150620693947597241011005/7db4fc1e47b449e1bce5313b36f9e407-4.m3u8" },
    { title: "提防“兼职”陷阱", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/06/29/152114671570628608381011005/70d78f587965449e9328d108dba82e58-4.m3u8" },
    { title: "“高价车衣”理赔骗局", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/06/25/151969321279432704312011005/d7954fa29de84f0da7364e5fc03cca9d-4.m3u8" },
    { title: "智擒“飞贼”", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/06/25/151965633121802650029011005/1be0e406eceb47378fcf6a2a0115c871-4.m3u8" },
    { title: "私改电池酿火灾", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/06/24/151933291544953242012011005/9a88e695b933484d9b836af76e00d1c8-4.m3u8" },
    { title: "禁渔红线不可越", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/06/22/151860821028742758829011005/a5a68260b17d4d7eacea55129c3a1de3-4.m3u8" },
    { title: "难逃法网", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/06/18/151715911587001549212011005/22bd77d22b714962bcfa64cae77a22be-4.m3u8" },
    { title: "“闪婚”诈骗", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/06/17/151679903556367565212011005/682ada2c5dc140f6af0ed066430f547b-4.m3u8" },
    { title: "工伤认定的边界", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/06/16/151643613926869402081011005/bd21172823894bd2852f79891613f90c-4.m3u8" },
    { title: "警惕“帮忙”被诈骗", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/06/15/151607405436191539676011005/d9999da966ab40cdacb4e74dda4d70a6-4.m3u8" },
    { title: "蹊跷的失窃案", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/06/12/151498532483845734825011005/04a98cd123c4451999329afd5bc810d0-4.m3u8" },
    { title: "私养蟒蛇触刑法", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/06/11/151462451795279462844011005/9a487152d5fe4838a1f2e90f3bb32290-4.m3u8" },
    { title: "“世界海洋日”特别策划 共护野生中国鲎", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/06/10/151426099342667366826011005/7b1fc51a561940c4b2fe35ae52715fce-4.m3u8" },
    { title: "“世界海洋日”特别策划 筑牢保护区生态防线", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/06/09/151390146028408832476011005/ed12a1c880f14145a21768e6ae8588be-4.m3u8" },
    { title: "“世界海洋日”特别策划 修复海底珊瑚", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/06/08/151353473528997069144011005/668ec2e1f3684f8fb2b36d4c94df6e46-4.m3u8" },
    { title: "“职业闭店人”需严惩", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/06/05/151244657803745280406011005/c07e4327fa51405da1c4c89fad137ecb-4.m3u8" },
    { title: "被遥控的重量", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/06/04/151208792905414246876011005/9260fe455fda4014af19ab15bf209a44-4.m3u8" },
    { title: "兼职引出的“黑产链条”", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/06/03/151172295555522150735011005/f226615975e946b9b9cf355bbdf5ee26-4.m3u8" },
    { title: "谁该担责", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/06/02/151136319538759680226011005/576e54a60c484d17ba8e73e0cd4a4548-4.m3u8" },
    { title: "“《民法典》宣传月”特别策划 装修惹的祸", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/05/29/150991818577759846725011005/1674062045574506bda0ed624ec61353-4.m3u8" },
    { title: "“《民法典》宣传月”特别策划 破解加装电梯难题", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/05/28/150956382873750323606011005/44a918085b66407fb286b6a370e3f72a-4.m3u8" },
    { title: "“《民法典》宣传月”特别策划 楼上漏水谁之责", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/05/28/150955485156379443606011005/5e9f13917ae646689818f270724cc50d-4.m3u8" },
    { title: "非法狩猎酿悲剧", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/05/26/150882568130927411625011005/b9628b0671494121a14053cc97416ca2-4.m3u8" },
    { title: "老年网恋陷阱", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/05/25/150845991945329868976011005/3b44577396404efdb264e0e6b9ad6b70-4.m3u8" },
    { title: "恶意索赔的代价", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/05/22/150737773284277862806011005/1865025236b444639a36071ea4cf3537-4.m3u8" },
    { title: "碎片为证", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/05/21/150701189930189210025011005/54968edf98c54bdc953db089135b843b-4.m3u8" },
    { title: "高薪招工的幌子", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/05/20/150664895121990041926011005/744791206dbc4f11af74d327a8cef607-4.m3u8" },
    { title: "肇事挪车引纠纷", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/05/19/150628821133409894806011005/39f5345eae15476ca4ae9535f055671e-4.m3u8" },
    { title: "《监狱法》修订特别策划 高墙内的蜕变", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/05/18/150592763156156826035011005/40301071375d4d018ff3003292fcf73a-4.m3u8" },
    { title: "“二手交易”压价陷阱", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/05/15/150490901422521139626011005/83285cb8fc3b49e8883ad8bd68c11ff4-4.m3u8" },
    { title: "恢复身份的判决", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/05/14/150448053626267648425011005/d726f7cb42ae484790b084e1f77d2f32-4.m3u8" },
    { title: "瞄准老人的“碰瓷”诈骗", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/05/13/150411689989121229206011005/14688b94a03d4ad6a501a70af96ce2e0-4.m3u8" },
    { title: "遗落的罪证", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/05/12/150375349066644275526011005/f7c09e6d2805427199cd45ea8375bcb9-4.m3u8" },
    { title: "工地受伤谁担责", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/05/11/150338872531828326844011005/276af76448e744bcaa922f0f5b21563f-4.m3u8" },
    { title: "改装超载之祸", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/05/08/150230034627517645176011005/ef9df2d0cadf44db8869197ae074b6ba-4.m3u8" },
    { title: "打击“致幻”电子烟犯罪", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/05/07/150193993237483110825011005/0c27841a814948dc8e36aa13addf21f6-4.m3u8" },
    { title: "谁该为救援买单", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/05/06/150157639912024883635011005/afd1bf329c3648839fef0abb6d04aaae-4.m3u8" },
    { title: "涉诈的抽奖卡片", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/04/30/149940276225456128235011005/2d960385accd45faa250816fb05e33fa-4.m3u8" },
    { title: "捣毁边境毒网", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/04/29/149904162687114445276011005/a7f2b7a7e8d14aaf9d2a2ec2ae09cedc-4.m3u8" },
    { title: "警惕“网课退费”骗局", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/04/28/149867873592806195644011005/eda9d89ce78347259ea1f7f363f233f3-4.m3u8" },
    { title: "“税收宣传月”特别策划 追缴千万税款", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/04/27/149831551413839872425011005/2672d1bbbda947f2b055ff36b1f8a3ef-4.m3u8" },
    { title: "被找回的人生", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/04/24/149722773550984806826011005/84986cc3bcc5448d909b904f96fc52eb-4.m3u8" },
    { title: "假冒的“国医大师”", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/04/23/149686756276104806826011005/056d3a2bd94e483fadbb785373fa1aac-4.m3u8" },
    { title: "无法兑现的理赔", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/04/22/149650238410617241944011005/0b20d36753354b888f6d45dbd373d537-4.m3u8" },
    { title: "莫让假化肥坑农", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/04/21/149614023076934041906011005/ba33fe3b3ab64df8a27ea72502ff5129-4.m3u8" },
    { title: "纵火难掩真相", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/04/20/149577463860226048425011005/8cf3add5815140efbb7ef533263fc773-4.m3u8" },
    { title: "江上隐秘盗油链", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/04/17/149468946374732186076011005/983e42ba0b12462da258e6b297d4ae2b-4.m3u8" },
    { title: "证件盗用引发的“限高消费”", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/04/16/149432774672280371635011005/ba81345ea3504166b08d353b4eacdc3a-4.m3u8" },
    { title: "被“跟踪”的三轮车", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/04/15/149396813903491482006011005/fe47d16a3d354fa18eec36860f519368-4.m3u8" },
    { title: "千里归乡", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/04/14/149360196061741875576011005/c05ece46d732401db82610e191d593c1-4.m3u8" },
    { title: "高薪背后的租车圈套", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/04/13/149324204490807296444011005/4dcf9f388c374e4b9c4b9dbf108e2f9e-4.m3u8" },
    { title: "非法电捕的幕后", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/04/10/149215306483370803644011005/10a2ac945a294e8b98ab0813f770242c-4.m3u8" },
    { title: "六年骗保现形记", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/04/09/149179085846401434035011005/2ba8c79026774bcc9ccbc03776400447-4.m3u8" },
    { title: "“助学”为名的陷阱", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/04/08/149142840801527808426011005/c33e46e9c1434ca4a4a1553ffd7f3ca3-4.m3u8" },
    { title: "“离”不掉的亲情", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/04/07/149106591658811802026011005/cf6ca551590c47dab137c4aa432f142b-4.m3u8" },
    { title: "无畏担当", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/04/03/148961731021985792406011005/3149cdad07cf497eb4a88417e63220f2-4.m3u8" },
    { title: "免考办证的陷阱", url: "https://res.cctvnews.cctv.com/video/1005/videos/2026/04/02/148925174916614963606011005/96d1aba06ac44c87937f24e434211e35-4.m3u8" }
];

// ================== 应用配置 ==================
var appConfig = {
    ver: 1,
    title: '央视新闻·今日说法',
    site: SITE,
    tabs: [{ name: '今日说法', ext: { id: 'jrsf', url: 'local' } }],
};

async function getConfig() { return jsonify(appConfig); }

// ================== 首页：保留 1 个封面照片 ==================
async function getCards(ext) {
    var cards = [];
    if (LOCAL_VIDEOS.length === 0) return jsonify({ list: [] });

    cards.push({
        vod_id: 'jrsf_all', 
        vod_name: '今日说法（合集）', 
        // ★ 只留这一个固定的封面图作为首页卡片图片
        vod_pic: "https://img.cctvnews.cctv.com/image/1005/snapshot/155194549641657139244001005/9ec14533bc54435db9a7695f6964ab50.jpeg", 
        vod_remarks: '共 ' + LOCAL_VIDEOS.length + ' 集',
        ext: { id: 'jrsf_all' }
    });

    return jsonify({ list: cards });
}

// ================== 详情页：纯文字选集列表 ==================
async function getTracks(ext) {
    ext = argsify(ext) || {};
    var tracks = [];

    if (LOCAL_VIDEOS.length > 0) {
        for (var i = 0; i < LOCAL_VIDEOS.length; i++) {
            var item = LOCAL_VIDEOS[i];
            tracks.push({
                name: '第' + (i + 1) + '集 ' + item.title,
                pan: '',
                ext: { url: item.url }
            });
        }
    }

    if (tracks.length === 0) {
        tracks.push({ name: '暂无剧集', pan: '', ext: { url: '' } });
    }

    return jsonify({ list: [{ title: '今日说法选集', tracks: tracks }] });
}

// ================== 播放信息 ==================
async function getPlayinfo(ext) {
    ext = argsify(ext) || {};
    if (!ext.url) return jsonify({ urls: [] });
    
    return jsonify({
        urls: [ext.url],
        headers: { 'User-Agent': UA, 'Referer': SITE + '/' },
    });
}

async function search(ext) { return jsonify({ list: [] }); }
