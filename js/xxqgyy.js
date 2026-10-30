const cheerio = createCheerio();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const SITE = 'https://www.xuexi.cn';
const DEFAULT_PIC = 'https://boot-img.xuexi.cn/image/1005/process/93ef3edd804a4a26b7f8f899e8bf258c.jpg';

// ==================== 1. 动态频道列表 ====================
const CHANNEL_LIST = {
    movie: 'https://www.xuexi.cn/lgdata/18rkaul9h7l.json',
    movie_tv: 'https://www.xuexi.cn/lgdata/109tvcosfnl.json',
    movie_doc: 'https://www.xuexi.cn/lgdata/17fsu5j4hnl.json'
};

// ==================== 2. 动画列表（按历史时期分类 - 终极完整版） ====================
const ANIMATION_LIST = [
    // -------------------- 远古 --------------------
    { name: '神话故事', pic: 'https://boot-img.xuexi.cn/image/1005/process/a358ddf4ea2e469eb2c9a465ec87de21.jpg', desc: '全24集', period: '远古', artIds: ['6142922305421370437'] },
    { name: '山海精奇', pic: 'https://boot-img.xuexi.cn/image/1005/process/0678c9f7ff344c9fbcdbe7077d54c9ae.jpg', desc: '全31集', period: '远古', artIds: ['16368297497425794160'] },
    { name: '山海传奇', pic: 'https://boot-img.xuexi.cn/image/1005/process/d15683e37efa4d11ab877e9055a098ea.jpg', desc: '全13集', period: '远古', artIds: ['1860699912324656805'] },
    { name: '百鸟朝凤', pic: 'https://boot-img.xuexi.cn/image/1005/process/07f0383da8b14e7fbbcd6c17642bbd57.jpg', desc: '全13期', period: '远古', artIds: ['16779415789626394562'] },
    { name: '故事奶奶 第二季', pic: 'https://boot-img.xuexi.cn/image/1005/process/63ee34fdf1fa44d8bc7d6d9b207230e6.jpg', desc: '全26集', period: '远古', artIds: ['17455611164200715619'] },
    { name: '愚公移山', pic: 'https://boot-img.xuexi.cn/image/1005/process/9bc27ea7a2a443d48144b8e63ec6ee13.jpg', desc: '全10集', period: '远古', artIds: ['9289807359150837778'] },
    { name: '山海经之再见怪兽预告', pic: 'https://boot-img.xuexi.cn/image/1005/process/142826c991894536abbc7173ebe28864.jpg', desc: '01:44', period: '远古', artIds: ['2186377970103151026'] },

    // -------------------- 夏商周 --------------------
    { name: '哪吒闹海', pic: 'https://boot-img.xuexi.cn/image/1005/process/03dc2ef7f6b14b2d967359dc282c582f.jpg', desc: '53:26', period: '夏商周', artIds: ['15027617659695369041'] },
    { name: '东郭先生', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/71d42f7e1b6a4a27ab8d13a18eeace90_crop_1575961744337_h_422_w_750_1575961744432_h_422_w_750.jpg', desc: '10:21', period: '夏商周', artIds: ['12334704250988591233'] },
    { name: '鹬蚌相争', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/06b42301bd4f44c1aef756336880c1a4_crop_new_h_422_w_750_h_422_w_750.jpg', desc: '09:38', period: '夏商周', artIds: ['6081558343718768596'] },
    { name: '大禹治水', pic: 'https://boot-img.xuexi.cn/image/1005/process/dc3f12c663a1437fbf18669d8c312d37.png', desc: '全12集', period: '夏商周', artIds: ['2222089652804542292'] },
    { name: '中华治水故事', pic: 'https://boot-img.xuexi.cn/image/1005/process/01a06756a5bc4818b8f47e31b2903df9.jpg', desc: '全26集', period: '夏商周', artIds: ['17740314066450394774'] },
    { name: '年画中的传奇', pic: 'https://boot-img.xuexi.cn/image/1005/process/c2d80bcb5f5a4cf08ba1adcd9283f392.jpg', desc: '全30集', period: '夏商周', artIds: ['10409760182347855695'] },
    { name: '哪吒传奇', pic: 'https://boot-img.xuexi.cn/image/1005/process/395e971624d243619c0cf444418ef5b9.jpg', desc: '全52集', period: '夏商周', artIds: ['10428547373355348143'] },
    { name: '少年英雄小哪吒', pic: 'https://boot-img.xuexi.cn/image/1005/process/2efa18bef839420d8a6a2f3025d1bde3.png', desc: '全26集', period: '夏商周', artIds: ['15813614759084751263'] },
    { name: '少年师爷之公祭大禹', pic: 'https://boot-img.xuexi.cn/image/1005/process/3e31244533b14847b6f64ccec0585a25.jpg', desc: '全26集', period: '夏商周', artIds: ['5828744918912178544'] },
    { name: '孔子', pic: 'https://boot-img.xuexi.cn/image/1005/process/f063b05bd36943eb8f55a1c44168b917.jpg', desc: '全104集', period: '夏商周', artIds: ['8937425226398520134'] },
    { name: '孟母教子', pic: 'https://boot-img.xuexi.cn/image/1005/process/5412f4ba1a9c40709341581461af2f2a.jpg', desc: '全30集', period: '夏商周', artIds: ['14368570024158892507'] },
    { name: '论语名句故事', pic: 'https://boot-img.xuexi.cn/image/1005/process/e6430273713d4cc1887c338118f09225.jpg', desc: '全20期', period: '夏商周', artIds: ['18222682595813693765'] },
    { name: '医宗扁鹊', pic: 'https://boot-img.xuexi.cn/image/1005/process/0a4296bf36f446c299c938d392e3e8e5.jpg', desc: '全15期', period: '夏商周', artIds: ['13299740271864184112'] },
    { name: '新神榜：杨戬预告', pic: 'https://boot-img.xuexi.cn/image/1005/process/fbe6bdbc3ccc4eb79515fa0831161c7c.jpg', desc: '02:02', period: '夏商周', artIds: ['18267311220815194064'] },
    { name: '新神榜：哪吒重生预告', pic: 'https://boot-img.xuexi.cn/image/1005/process/02713bc28e7647a89c36091919b794e1.jpg', desc: '02:25', period: '夏商周', artIds: ['1912256288681167769'] },
    { name: '姜子牙预告', pic: 'https://boot-img.xuexi.cn/image/1005/process/d7b99413235d43f19660259f83aa151e.jpg', desc: '01:51', period: '夏商周', artIds: ['4820452760901676941'] },
    { name: '哪吒之魔童降世主题曲《哪吒》', pic: 'https://boot-img.xuexi.cn/image/1005/process/265491eee2a14a05b68ac31ff902dcc3.jpg', desc: '02:11', period: '夏商周', artIds: ['8135508913935655500'] },

    // -------------------- 秦汉三国 --------------------
    { name: '丝路传奇特使张骞', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/7ec29b537147417f9b7c57d284d55c9c_crop_1581671578923_h_422_w_750_1581671578946_h_422_w_750.jpg', desc: '全52集', period: '秦汉三国', artIds: ['4223661874274269490'] },
    { name: '丝路', pic: 'https://boot-img.xuexi.cn/image/1005/process/cfac9f6f92f54ef8b2342227ea3288bb.jpg', desc: '全52集', period: '秦汉三国', artIds: ['14403418793113483431'] },
    { name: '宝莲灯', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/326e23d959b1413bbc317b6516432b19_crop_new_h_422_w_750_h_422_w_750.jpg', desc: '01:15:33', period: '秦汉三国', artIds: ['3663785737233679069'] },
    { name: '曹冲称象', pic: 'https://boot-img.xuexi.cn/image/1020/process/7f73cfa3653d4cbd9d95e22be8e03ff4.jpg', desc: '15:55', period: '秦汉三国', artIds: ['9390316001322059676'] },
    { name: '张飞审瓜', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/040116069185421cb95483d0afaf6740_crop_1576550000337_h_422_w_750_1576550000390_h_422_w_750.jpg', desc: '24:29', period: '秦汉三国', artIds: ['6945696703301578592'] },
    { name: '俑之城预告', pic: 'https://boot-img.xuexi.cn/image/1005/process/fdb241d72d434ef18945101f304ce3a8.jpg', desc: '01:27', period: '秦汉三国', artIds: ['15374479257893505332'] },

    // -------------------- 晋南北朝 --------------------
    { name: '好心宝宝之冼夫人', pic: 'https://boot-img.xuexi.cn/image/1005/process/d73682fd1e8d4c2c853e0c088f51bbd7.jpg', desc: '全26集', period: '晋南北朝', artIds: ['6635019207490556798'] },
    { name: '九色鹿', pic: 'https://boot-img.xuexi.cn/image/1020/process/8b2d2a1b3ff542fe963545b684080b95.jpg', desc: '24:51', period: '晋南北朝', artIds: ['1915204821127076213'] },

    // -------------------- 隋唐宋 --------------------
    { name: '千秋诗颂', pic: 'https://boot-img.xuexi.cn/image/1005/process/87e3f266bd9946f4b3ba378621829009.jpg', desc: '全11集', period: '隋唐宋', artIds: ['8432909394850269379'] },
    { name: '少年岳飞', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/97e323ca74b84306ad29984e53ebb09b_crop_new_h_422_w_750_h_422_w_750.jpg', desc: '全1集', period: '隋唐宋', artIds: ['2462806302483100325'] },
    { name: '敦煌的故事', pic: 'https://boot-img.xuexi.cn/image/1005/process/00dfd001cd334a4196493b1f0e42794b.jpg', desc: '全13集', period: '隋唐宋', artIds: ['16588381422921021829'] },
    { name: '杨家将(上)', pic: 'https://boot-img.xuexi.cn/image/1005/process/b3b64bccc583471da068ef067de828bf.jpg', desc: '全6集', period: '隋唐宋', artIds: ['3323720718145398493'] },
    { name: '少年苏东坡', pic: 'https://boot-img.xuexi.cn/image/1005/process/37053f991326439aafefa3d5794364b0.jpg', desc: '全52集', period: '隋唐宋', artIds: ['16464293379283892941'] },
    { name: '药王孙思邈', pic: 'https://boot-img.xuexi.cn/image/1005/process/01baeb0e500f408c9547ff03504e1dc7.jpg', desc: '全3期', period: '隋唐宋', artIds: ['9557138531979238503'] },
    { name: '中医故事', pic: 'https://boot-img.xuexi.cn/image/1005/process/956d0af9e50b47298d6babb5a5eb7c26.jpg', desc: '全30集', period: '隋唐宋', artIds: ['12151799063507643061'] },
    { name: '南丰先生', pic: 'https://boot-img.xuexi.cn/image/1005/process/0b00c12b9f1a4c468756673989da721f.jpg', desc: '全7期', period: '隋唐宋', artIds: ['15679252279683246829'] },
    { name: '唐诗小神童', pic: 'https://boot-img.xuexi.cn/image/1005/process/4e41039469614a6a9e060bde281ab4fd.jpg', desc: '全24集', period: '隋唐宋', artIds: ['140112176922925939'] },
    { name: '长安三万里：《将进酒》特别视频', pic: 'https://boot-img.xuexi.cn/image/1005/process/85d4590347db4b418d4bd543654370ce.jpg', desc: '02:30', period: '隋唐宋', artIds: ['9744931457870738155'] },
    { name: '济公斗蟋蟀', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/290b2f8f9426420aaefe6805ca299a8c_crop_1575964350327_h_422_w_750_1575964350385_h_422_w_750.jpg', desc: '24:25', period: '隋唐宋', artIds: ['13197244809156240508'] },
    { name: '白蛇2：青蛇劫起预告', pic: 'https://boot-img.xuexi.cn/image/1005/process/cf90059427974be4aae464593febe2c1.jpg', desc: '01:49', period: '隋唐宋', artIds: ['15643349417591470185'] },
    { name: '白蛇：缘起主题曲《何须问》', pic: 'https://boot-img.xuexi.cn/image/1005/process/3c710c44e1644ec89137d3b00c660303.jpg', desc: '03:04', period: '隋唐宋', artIds: ['12187648447265016912'] },
    { name: '济公之降龙降世预告', pic: 'https://boot-img.xuexi.cn/image/1005/process/eec6db03d1c54a94b6b5c2bd69e7a1e5.jpg', desc: '02:01', period: '隋唐宋', artIds: ['15006003941147647610'] },

    // -------------------- 元明清 --------------------
    { name: '大闹天宫', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/6ee983d7ad484c2e850f79623b78c1ee_crop_new_h_422_w_750_h_422_w_750.jpg', desc: '全1集', period: '元明清', artIds: ['8194123786378038012'] },
    { name: '西游记', pic: 'https://boot-img.xuexi.cn/image/1005/process/531511400a964d52b43cdc8dde3c49ac.jpg', desc: '全52集', period: '元明清', artIds: ['6125097417779881106'] },
    { name: '西游记的故事', pic: 'https://boot-img.xuexi.cn/image/1005/process/da2bc743c831456189ca005369972431.jpg', desc: '全52期', period: '元明清', artIds: ['2304583198961030188'] },
    { name: '金猴降妖', pic: 'https://boot-img.xuexi.cn/image/1020/process/d9b2bdd1d70c42c8bbd9a880c6dc6543.jpg', desc: '01:27:57', period: '元明清', artIds: ['6185271594807595964'] },
    { name: '少年师爷', pic: 'https://boot-img.xuexi.cn/image/1005/process/7de0a98b01d641f99324823f2cd9912c.jpg', desc: '全26集', period: '元明清', artIds: ['2056682991035843311'] },
    { name: '故宫里的大怪兽 洞光宝石的秘密', pic: 'https://boot-img.xuexi.cn/image/1005/process/0a184835891e4ddb953149daaa909900.jpg', desc: '全26集', period: '元明清', artIds: ['9976204589374160998'] },
    { name: '故宫里的大怪兽 月光迷宫', pic: 'https://boot-img.xuexi.cn/image/1005/process/6eba1eb8ebc14338a1e27f3db74f5712.jpg', desc: '全26集', period: '元明清', artIds: ['4519958102638904658'] },
    { name: '漫话大运河北京段', pic: 'https://boot-img.xuexi.cn/image/1005/process/9d95be6c03584ffbaaf91390da1f1615.jpg', desc: '全12期', period: '元明清', artIds: ['14934891225169199756'] },
    { name: '“风”从运河来', pic: 'https://boot-img.xuexi.cn/image/1005/process/705ab2cbac614e50af67d233188b471d.jpg', desc: '全12期', period: '元明清', artIds: ['2551461682367604991'] },
    { name: '中国巧姑娘之黄道婆', pic: 'https://boot-img.xuexi.cn/image/1020/process/95992741078d475486bab2645c813718.jpg', desc: '全13期', period: '元明清', artIds: ['7319655934100617365'] },
    { name: '茶婆婆渔婆婆蚕婆婆 (合集)', pic: 'https://boot-img.xuexi.cn/image/1009/process/cd090627d4a74cd2ab3c19e44317dd2d.jpg', desc: '全3季', period: '元明清', artIds: ['3532802750074198149', '5808432544675419092', '2829945011640661965'] },
    { name: '西游记之大圣归来', pic: 'https://boot-img.xuexi.cn/image/1005/process/28f6e60c7d534301a3d08846094f3e61.jpg', desc: '01:27:07', period: '元明清', artIds: ['327049363609056878'] },
    { name: '小虎墩大英雄插曲《骁》', pic: 'https://boot-img.xuexi.cn/image/1005/process/df689d91b54e4b9788614b043c01ae69.jpg', desc: '01:36', period: '元明清', artIds: ['7906291778513957217'] },

    // -------------------- 现代 --------------------
    { name: '大鸾——周恩来童年读书的故事', pic: 'https://boot-img.xuexi.cn/image/1005/process/996d7a95d0e04a92b55e25fd6767bc36.jpg', desc: '全1集', period: '现代', artIds: ['4606834724344024542'] },
    { name: '翻开这一页', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/c174268cf5664260a6ec597f2217602a_crop_1582088569128_h_422_w_750_1582088569182_h_422_w_750.jpg', desc: '全26集', period: '现代', artIds: ['10590178754709049060'] },
    { name: '鸡毛信', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/ea079c1c21634554885e90668ebb0800_crop_1580975481166_h_422_w_750_1580975481291_h_422_w_750.jpg', desc: '全12集', period: '现代', artIds: ['13355596699438012141'] },
    { name: '林海雪原', pic: 'https://boot-img.xuexi.cn/image/1005/process/98bedf46ee8746dbaadd86b3e73bb7a7.jpg', desc: '全50集', period: '现代', artIds: ['11655163781253226496'] },
    { name: '长征先锋', pic: 'https://boot-img.xuexi.cn/image/1005/process/521e22e4b1154a2d9551f6d9fbb4376d.jpg', desc: '全52集', period: '现代', artIds: ['7521238365152978329'] },
    { name: '犟驴小红军', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/5646dcb04b6041abaff2359f45a2c96b_crop_1581052257107_h_422_w_750_1581052257185_h_422_w_750.jpg', desc: '全12集', period: '现代', artIds: ['1439398455075646484'] },
    { name: '寻找英雄 小淘气长征记', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/9652b016cd394ae49590bac4010090e5_crop_new_h_422_w_750_h_422_w_750.jpg', desc: '全26集', period: '现代', artIds: ['783402746357409941'] },
    { name: '那年那兔那些事儿', pic: 'https://boot-img.xuexi.cn/image/1006/process/9a020fdb20104931ad51743d44519c51.jpg', desc: '全3季', period: '现代', artIds: ['32561504674169041'] },
    { name: '四渡赤水', pic: 'https://boot-img.xuexi.cn/image/1005/process/76fb7792312d42be936e04e65fca3325.jpg', desc: '全8集', period: '现代', artIds: ['8374057897549941762'] },
    { name: '奶泡泡学成语 第一季', pic: 'https://boot-img.xuexi.cn/image/1005/process/55c9d61502ef45e2ae8d773352536c9a.jpg', desc: '全26集', period: '现代', artIds: ['17367580309808587726'] },
    { name: '豆乐国学小剧场 第一季', pic: 'https://boot-img.xuexi.cn/image/1005/process/0638b62d57564f2ca90536a6de056d0a.jpg', desc: '全40集', period: '现代', artIds: ['11405479019509190158'] },
    { name: '围棋旋风 新围棋少年', pic: 'https://boot-img.xuexi.cn/image/1005/process/fba5180fbc2c4bd18daaeb0f7bd45f05.jpg', desc: '全52集', period: '现代', artIds: ['17561722638033144923'] },
    { name: '启鱼·成语故事 动物篇', pic: 'https://boot-img.xuexi.cn/image/1005/process/765b06345fda4428a11294e1f49cf29b.jpg', desc: '全26集', period: '现代', artIds: ['13528417134230275522'] },
    { name: '汉字学堂', pic: 'https://boot-img.xuexi.cn/contribute_img/20200204164426/35404465679269191.jpg', desc: '全26期', period: '现代', artIds: ['366889883716896820'] },
    { name: '汉字列传', pic: 'https://boot-img.xuexi.cn/image/1005/process/c41b8297ca8e4ccca31988e405f5e2b9.jpg', desc: '全28期', period: '现代', artIds: ['11001669404861096230'] },
    { name: '铜鼓传奇', pic: 'https://boot-img.xuexi.cn/image/1005/process/a8facee935f1441ba505d589ecc278b0.png', desc: '全26集', period: '现代', artIds: ['2748552728628821387'] },
    { name: '蹴鞠小子', pic: 'https://boot-img.xuexi.cn/image/1020/process/89fb4de74a354963b3f11100e82b781f.jpg', desc: '全52集', period: '现代', artIds: ['13256036725055877556'] },
    { name: '深海告别曲《再见深海》', pic: 'https://boot-img.xuexi.cn/image/1005/process/0ad2d8c6943b40a49712c98f68c0b50b.jpg', desc: '03:06', period: '现代', artIds: ['13043879645056563589'] },
    { name: '我们的冬奥预告', pic: 'https://boot-img.xuexi.cn/image/1005/process/83239b4e4ee74da7ac92036fd5d95e16.jpg', desc: '01:05', period: '现代', artIds: ['12756107224700013763'] },
    { name: '罗小黑战记推广曲《不再流浪》', pic: 'https://boot-img.xuexi.cn/image/1005/process/20807ebdd576402982f9d1c9c03d32cc.jpg', desc: '03:36', period: '现代', artIds: ['9019086056293013635'] },

    // -------------------- 经典动画 --------------------
    { name: '三个和尚', pic: 'https://boot-img.xuexi.cn/image/1020/process/3b621d686f61496dab3cef5541e6b114.jpg', desc: '18:43', period: '经典动画', artIds: ['945854044800212979'] },
    { name: '小鲤鱼跳龙门', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/fe0cad97b7434e96832b1b50172c4173_crop_1576028303348_h_422_w_750_1576028303403_h_422_w_750.jpg', desc: '18:31', period: '经典动画', artIds: ['12545612465668490278'] },
    { name: '金色的海螺', pic: 'https://boot-img.xuexi.cn/image/1005/process/ef42c79702154c5bb3e735d7dec3aac4.jpg', desc: '34:35', period: '经典动画', artIds: ['8996177541884222716'] },
    { name: '乌鸦为什么是黑的', pic: 'https://boot-img.xuexi.cn/image/1020/process/d110971600474d6abcf66e4dce258a69.jpg', desc: '09:53', period: '经典动画', artIds: ['13828990101540997440'] },
    { name: '老虎学艺', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/822bec6ba0214fb19d27a3342f5e7cd9_crop_1578298513328_h_422_w_750_1578298513364_h_422_w_750.jpg', desc: '13:02', period: '经典动画', artIds: ['2054194417399852563'] },
    { name: '咕咚来了', pic: 'https://boot-img.xuexi.cn/image/1005/process/542d3fb34d904e57a8d2edaf88f31b90.jpg', desc: '18:35', period: '经典动画', artIds: ['3624893344472473333'] },
    { name: '过猴山', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/56405669c2fd41ef800568903de67ad2_crop_1576028384337_h_422_w_750_1576028384377_h_422_w_750.jpg', desc: '09:53', period: '经典动画', artIds: ['7754703357086456825'] },
    { name: '人参娃娃', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/bb08ccc86a0648658ab02f4802bbf9f5_crop_1572937360335_h_422_w_750_1572937360440_h_422_w_750.jpg', desc: '24:54', period: '经典动画', artIds: ['14130867084486582474'] },
    { name: '狼来了', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/6d6f47e125d4408a9e38c956c184b023_crop_1577763635355_h_422_w_750_1577763635395_h_422_w_750.jpg', desc: '15:08', period: '经典动画', artIds: ['8921578347875960107'] },
    { name: '猴子捞月', pic: 'https://boot-img.xuexi.cn/image/1020/process/655aff61339f46428a2a32cd33e94b18.jpg', desc: '09:55', period: '经典动画', artIds: ['7321031469238197075'] },
    { name: '怕羞的黄莺', pic: 'https://boot-img.xuexi.cn/image/1005/process/57b73b4428e443cca1a43332c33d68ab.jpg', desc: '18:01', period: '经典动画', artIds: ['2226289661459173468'] },
    { name: '小蝌蚪找妈妈', pic: 'https://boot-img.xuexi.cn/image/1020/process/5b9b3d643f4645d293020401ff6ea7ed.jpg', desc: '14:40', period: '经典动画', artIds: ['18070108324758319059'] },
    { name: '黑猫警长', pic: 'https://boot-img.xuexi.cn/image/1020/process/59c33c9d5dd94824b40fa8113d13adda.jpg', desc: '全5集', period: '经典动画', artIds: ['9166463331683308192'] },
    { name: '没头脑和不高兴', pic: 'https://boot-img.xuexi.cn/image/1020/process/ca49fb557d1a4caeb90b3405d0532c4a.jpg', desc: '20:26', period: '经典动画', artIds: ['12699240896553924434'] },
    { name: '阿凡提', pic: 'https://boot-img.xuexi.cn/image/1020/process/c21388e64fd049fcb79807ab158b61e1.jpg', desc: '30:50', period: '经典动画', artIds: ['11304066517453968658'] },
    { name: '邋遢大王奇遇记', pic: 'https://boot-img.xuexi.cn/image/1020/process/26fa1a3255fd4fb89539cab5655bce3d.jpg', desc: '全13集', period: '经典动画', artIds: ['16772808008338132374'] },
    { name: '葫芦小金刚', pic: 'https://boot-img.xuexi.cn/image/1005/process/0c549a7ca83b4282be0706e32cee7c95.jpg', desc: '全6集', period: '经典动画', artIds: ['12204388952267981132'] },
    { name: '葫芦兄弟', pic: 'https://boot-img.xuexi.cn/image/1005/process/97fd425f8db4481287251446f12acc40.jpg', desc: '全13集', period: '经典动画', artIds: ['12825975550683457183'] },
    { name: '神笔', pic: 'https://boot-img.xuexi.cn/image/1005/process/45015f050f804aa187fd0b19c6cc1629.jpg', desc: '20:53', period: '经典动画', artIds: ['10159293756758922375'] },
    { name: '雪孩子', pic: 'https://boot-img.xuexi.cn/image/1020/process/d640f2d0784d44dcb79253deb6d75228.jpg', desc: '18:14', period: '经典动画', artIds: ['4555990008799091991'] },
    { name: '山水情', pic: 'https://boot-img.xuexi.cn/image/1005/process/6107c686465649f296e08b02ef3d4d43.jpg', desc: '19:09', period: '经典动画', artIds: ['14092195775999782520'] }
];

// 动画 tab 的 id → 时期 映射
const ANIMATION_PERIODS = {
    ani_yuangu: '远古',
    ani_xia: '夏商周',
    ani_qinhan: '秦汉三国',
    ani_jin: '晋南北朝',
    ani_suitang: '隋唐宋',
    ani_yuanmingqing: '元明清',
    ani_modern: '现代',
    ani_classic: '经典动画'
};

const HEADERS = {
    'User-Agent': UA,
    'Referer': SITE + '/',
    'Origin': SITE,
    'Accept': 'application/json, text/plain, */*'
};

let appConfig = {
    ver: 4,
    title: '学习强国',
    site: SITE,
    tabs: [
        { name: '远古动画', ext: { id: 'ani_yuangu' }, ui: 1 },
        { name: '夏商周动画', ext: { id: 'ani_xia' }, ui: 1 },
        { name: '秦汉三国动画', ext: { id: 'ani_qinhan' }, ui: 1 },
        { name: '晋南北朝动画', ext: { id: 'ani_jin' }, ui: 1 },
        { name: '隋唐宋动画', ext: { id: 'ani_suitang' }, ui: 1 },
        { name: '元明清动画', ext: { id: 'ani_yuanmingqing' }, ui: 1 },
        { name: '现代动画', ext: { id: 'ani_modern' }, ui: 1 },
        { name: '经典动画', ext: { id: 'ani_classic' }, ui: 1 },
        { name: '电影', ext: { id: 'movie' }, ui: 1 },
        { name: '电视剧', ext: { id: 'movie_tv' }, ui: 1 },
        { name: '纪录片', ext: { id: 'movie_doc' }, ui: 1 }
    ]
};

async function getConfig() { return jsonify(appConfig); }

function safeArgsify(ext) {
    if (ext == null) return {};
    if (typeof ext === 'object') return ext;
    try { return argsify(ext); } catch (e) { return {}; }
}

// ==================== 3. 横版海报处理 ====================
function makeLandscape(url) {
    if (!url) return url;
    if (url.indexOf('x-oss-process') !== -1) return url;
    if (url.indexOf('images.weserv.nl') !== -1) return url;

    const m = url.match(/_h_(\d+)_w_(\d+)/);
    if (m && parseInt(m[2], 10) > parseInt(m[1], 10)) return url;

    if (url.indexOf('boot-img.xuexi.cn') !== -1) {
        const sep = url.indexOf('?') === -1 ? '?' : '&';
        return url + sep + 'x-oss-process=image/resize,m_fill,w_750,h_422';
    }

    const clean = url.replace(/^https?:\/\//, '');
    return 'https://images.weserv.nl/?url=' + encodeURIComponent(clean) + '&w=750&h=422&fit=cover&output=jpg';
}

// ==================== 4. 动态获取卡片 ====================
async function getCards(ext) {
    ext = safeArgsify(ext);
    let page = ext.page || 1;
    if (page > 1) return jsonify({ list: [] });

    let id = ext.id || 'ani_yuangu';
    let cards = [];

    // ---------- 动画（按历史时期拆分） ----------
    if (id === 'ani' || ANIMATION_PERIODS[id]) {
        const period = ANIMATION_PERIODS[id];
        const list = period
            ? ANIMATION_LIST.filter(d => d.period === period)
            : ANIMATION_LIST;

        list.forEach(drama => {
            cards.push({
                vod_id: drama.artIds.join(','),
                vod_name: drama.name,
                vod_pic: makeLandscape(drama.pic),
                vod_remarks: drama.desc,
                ext: { type: 'tv_detail', artIds: drama.artIds }
            });
        });
        return jsonify({ list: cards });
    }

    // ---------- 其他频道 ----------
    let listUrl = CHANNEL_LIST[id];
    if (!listUrl) return jsonify({ list: [] });

    try {
        const { data } = await $fetch.get(listUrl, { headers: HEADERS });
        let list = typeof data === 'string' ? argsify(data) : data;
        const addedIds = new Set();

        if (Array.isArray(list)) {
            list.sort((a, b) => {
                let getTime = (item) => {
                    let t = item.publishTime || item.showTime || item.publish_time || item.create_time || item.time || 0;
                    if (typeof t === 'string') {
                        let parsed = Date.parse(t.replace(/-/g, '/'));
                        if (!isNaN(parsed)) return parsed;
                    }
                    return parseInt(t, 10) || 0;
                };
                return getTime(b) - getTime(a);
            });

            list.forEach(item => {
                let cover = item.thumbImage || item.image || item.pic || item.cover || item.imageUrl || '';
                if (cover && cover.indexOf('http') !== 0) {
                    cover = cover.indexOf('//') === 0 ? 'https:' + cover : SITE + (cover.charAt(0) === '/' ? '' : '/') + cover;
                }

                let itemId = item.itemId || item.id || item.article_id || '';
                if (!itemId && item.url) {
                    const match = item.url.match(/\/detail\/(\d+)/);
                    if (match) itemId = match[1];
                }

                if (itemId && addedIds.has(itemId)) return;
                if (itemId) addedIds.add(itemId);

                cards.push({
                    vod_id: itemId,
                    vod_name: item.title || '',
                    vod_pic: makeLandscape(cover || DEFAULT_PIC),
                    vod_remarks: item.showSource || item.publishTime || item.publish_date || '',
                    ext: { type: 'tv_detail', artIds: [itemId] }
                });
            });
        }
    } catch (e) {
        console.log('获取列表失败: ' + e.message);
    }

    return jsonify({ list: cards });
}

// ==================== 5. 解析底层数据 ====================
async function fetchSingleId(id) {
    try {
        const apiUrl = `https://boot-source.xuexi.cn/data/app/${id}.js`;
        const { data } = await $fetch.get(apiUrl, { headers: HEADERS });
        let text = String(data);
        let jsonStr = text;
        const start = text.indexOf('(');
        const end = text.lastIndexOf(')');
        if (start !== -1 && end !== -1) jsonStr = text.substring(start + 1, end);

        let detail = argsify(jsonStr);

        if (detail && detail.sub_items && detail.sub_items.length > 0) return detail.sub_items;
        if (detail && detail.videos && detail.videos.length > 0) {
            return [{ title: detail.title || '正片', videos: detail.videos }];
        }
    } catch (e) {}

    try {
        const specialUrl = `https://article.xuexi.cn/data/special/pc/${id}.js`;
        const { data: sData } = await $fetch.get(specialUrl, { headers: HEADERS });
        let sText = String(sData);
        let sJsonStr = sText;
        const sStart = sText.indexOf('(');
        const sEnd = sText.lastIndexOf(')');
        if (sStart !== -1 && sEnd !== -1) sJsonStr = sText.substring(sStart + 1, sEnd);

        let sDetail = argsify(sJsonStr);

        if (sDetail && sDetail.slots && sDetail.slots.length > 0) {
            let allEpisodes = [];
            sDetail.slots.forEach(slot => {
                let seasonName = slot.title ? slot.title.title : '';
                if (slot.list && slot.list.length > 0) {
                    slot.list.forEach(item => {
                        allEpisodes.push({
                            title: `${seasonName} ${item.title}`,
                            articleId: item.$$id
                        });
                    });
                }
            });
            return allEpisodes;
        }
    } catch (e) {}

    return [];
}

async function fetchSingleEpisode(artId) {
    try {
        const apiUrl = `https://article.xuexi.cn/data/app/${artId}.js`;
        const { data } = await $fetch.get(apiUrl, { headers: HEADERS });
        let text = String(data);
        let jsonStr = text;
        const start = text.indexOf('(');
        const end = text.lastIndexOf(')');
        if (start !== -1 && end !== -1) jsonStr = text.substring(start + 1, end);

        let detail = argsify(jsonStr);
        if (detail && detail.videos && detail.videos.length > 0) {
            let info = detail.videos[0].video_storage_info || [];
            if (info.length > 0) return info[0].normal || info[0].url || '';
        }
    } catch (e) {}
    return '';
}

// ==================== 6. 获取剧集 ====================
async function getTracks(ext) {
    ext = safeArgsify(ext);
    let tracks = [];

    if (ext.type === 'tv_detail' && ext.artIds) {
        let subItems = [];
        for (let id of ext.artIds) {
            subItems = subItems.concat(await fetchSingleId(id));
        }

        for (let i = 0; i < subItems.length; i++) {
            let item = subItems[i];
            let epName = item.title || `第${i + 1}集`;
            let bestUrl = '';

            if (item.videos && item.videos[0]) {
                let info = item.videos[0].video_storage_info || [];
                if (info.length > 0) bestUrl = info[0].normal || info[0].url || '';
            } else if (item.articleId) {
                bestUrl = await fetchSingleEpisode(item.articleId);
            }

            if (bestUrl) {
                tracks.push({ name: epName, pan: '', ext: { url: bestUrl } });
            }
        }

        if (tracks.length === 0) {
            tracks.push({ name: '暂无视频源', pan: '', ext: { url: '' } });
        }
        return jsonify({ list: [{ title: '剧集列表', tracks: tracks }] });
    }

    return jsonify({ list: [] });
}

// ==================== 7. 播放 ====================
async function getPlayinfo(ext) {
    ext = safeArgsify(ext);
    let url = ext.url;
    if (!url) return jsonify({ urls: [] });
    let urls = Array.isArray(url) ? url : [url];
    return jsonify({
        urls: urls,
        headers: { 'User-Agent': UA, 'Referer': SITE + '/' }
    });
}

// ==================== 8. 搜索 ====================
async function search(ext) {
    ext = safeArgsify(ext);
    const keyword = ext.text || ext.wd || '';
    const page = ext.page || 1;
    if (!keyword) return jsonify({ list: [], page });

    const endpoints = [
        `https://so.xuexi.cn/search/api/search.json?keyword=${encodeURIComponent(keyword)}&page=${page}&size=20&sort=default&type=all`,
        `https://so.xuexi.cn/search/api/search.json?keyword=${encodeURIComponent(keyword)}&page=${page}&size=20`,
        `https://www.xuexi.cn/search/api/search.json?keyword=${encodeURIComponent(keyword)}&page=${page}&size=20`
    ];

    const cards = [];
    const added = new Set();

    for (let i = 0; i < endpoints.length; i++) {
        try {
            const { data } = await $fetch.get(endpoints[i], { headers: HEADERS });
            let res = typeof data === 'string' ? argsify(data) : data;
            if (!res) continue;

            let items = null;
            if (res.data && Array.isArray(res.data.list)) items = res.data.list;
            else if (res.data && Array.isArray(res.data.items)) items = res.data.items;
            else if (res.data && Array.isArray(res.data.records)) items = res.data.records;
            else if (Array.isArray(res.list)) items = res.list;
            else if (Array.isArray(res.items)) items = res.items;
            else if (Array.isArray(res.data)) items = res.data;

            if (items && items.length > 0) {
                items.forEach(item => {
                    let itemId = item.itemId || item.id || item.article_id || item.articleId || item.docId || '';
                    if (!itemId && item.url) {
                        const match = String(item.url).match(/\/detail\/(\d+)/);
                        if (match) itemId = match[1];
                    }
                    if (!itemId || added.has(itemId)) return;
                    added.add(itemId);

                    let cover = item.thumbImage || item.image || item.pic || item.cover
                        || item.imageUrl || item.thumbnail || item.thumb || '';
                    if (cover && cover.indexOf('http') !== 0) {
                        cover = cover.indexOf('//') === 0
                            ? 'https:' + cover
                            : SITE + (cover.charAt(0) === '/' ? '' : '/') + cover;
                    }

                    cards.push({
                        vod_id: itemId,
                        vod_name: item.title || item.name || '',
                        vod_pic: makeLandscape(cover || DEFAULT_PIC),
                        vod_remarks: item.showSource || item.publishTime
                            || item.publish_date || item.source || '',
                        ext: { type: 'tv_detail', artIds: [itemId] }
                    });
                });

                if (cards.length > 0) break;
            }
        } catch (e) {
            console.log('search endpoint failed: ' + e.message);
        }
    }

    return jsonify({ list: cards, page });
}
