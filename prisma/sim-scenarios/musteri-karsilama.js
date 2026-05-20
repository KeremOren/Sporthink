// 9 senaryo — Müşteri Karşılama
module.exports = function (out, step, c) {
    const CAT = 'MUSTERI_KARSILAMA';

    out.push({
        category: CAT, title: 'Tereddütlü İlk Adım',
        description: 'Vitrini inceledikten sonra çekingen şekilde içeri giren müşteri ile ilk teması kurun.',
        difficulty: 'EASY', xpReward: 15,
        customerContext: 'Ayşe Hanım, 35 yaşlarında. Vitrindeki koşu ayakkabısına bakarak içeri giriyor ama göz teması kurmuyor.',
        steps: [
            step('Müşteri ayakkabı reyonuna doğru ilerliyor. Ne yaparsın?', [
                c('Hoş geldiniz! Aradığınız özel bir şey var mı?', [2, 1, 0, 0], 'Klasik karşılama, müşteriyi rahatlatmadı.'),
                c('Hoş geldiniz, ben Mehmet. Vitrindeki koşu ayakkabısını mı incelediniz? Yeni sezon ürünleri yeni geldi.', [3, 2, 1, 0], 'Mükemmel — kendini tanıttın ve gözlemi paylaştın.', true),
                c('Yardımcı olabilir miyim?', [1, 0, 0, 0], 'Çok genel. Müşteri "sadece bakıyorum" diyebilir.'),
                c('Hangi numara giyiyorsunuz?', [0, 0, 0, 0], 'Çok hızlı satış odaklı — müşteri ürkebilir.'),
            ]),
            step('"Koşmaya başlamayı düşünüyorum ama ne almalıyım bilmiyorum." Ne dersin?', [
                c('Harika karar! Hangi zeminde koşacaksınız — park, asfalt, koşu bandı?', [3, 3, 0, 1], 'İhtiyacı doğru tespit için harika soru.', true),
                c('Size en pahalı modeli göstereyim, profesyoneller tercih ediyor.', [0, 1, 2, 0], 'İhtiyaç öğrenmeden ürün önerdin.'),
                c('İlk koşu ayakkabınız için doğru yerdesiniz. Yürüyüş alışkanlığınızı sorabilir miyim?', [3, 2, 1, 1], 'İhtiyaç analizine güzel giriş.'),
                c('Bizde her bütçeye uygun seçenek var.', [1, 0, 1, 0], 'Genel cevap; gerçek ihtiyacı öğrenmedin.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Aceleci Telefonlu Müşteri',
        description: 'Telefonla konuşurken aceleyle içeri giren müşteriyi nasıl karşılarsın?',
        difficulty: 'MEDIUM', xpReward: 20,
        customerContext: 'Burak Bey, 28 yaşlarında. Telefonla konuşarak içeri giriyor, hızla siyah eşofman reyonuna yöneliyor.',
        steps: [
            step('Müşteri telefonu kapatıyor ve etrafına bakınıyor.', [
                c('Hoş geldiniz, eşofman takımı bölümümüzdesiniz. Hangi bedendesiniz?', [2, 2, 0, 1], 'Acelesini fark ederek doğrudan ilerledin.', true),
                c('Aaa hoş geldiniz, müthiş havalar değil mi?', [1, 0, 0, 0], 'Acelesi olana uygunsuz small-talk.'),
                c('Sessiz kal, kendisi sorar.', [0, 0, 0, 0], 'Pasif kaldın.'),
                c('Telefon konuşmanız uzun mu sürer?', [0, 0, 0, 0], 'Rahatsız edici giriş.'),
            ]),
            step('"Acelem var, siyah eşofman lazım, L beden."', [
                c('Hemen getiriyorum. Üst-alt set mi yoksa sadece alt mı?', [2, 2, 2, 2], 'Hızlı hareket + çapraz satış fırsatı.', true),
                c('Tabii, denemek ister misiniz?', [1, 1, 0, 1], 'Çapraz satış fırsatı kaçtı.'),
                c('L kalmadı sanırım, M veya XL deneyin.', [0, 0, 0, 0], 'Stoğu kontrol etmeden konuşma.'),
                c('Hemen paketleyeyim mi?', [2, 1, 0, 2], 'Empatik ama deneme önermek iyi olurdu.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Çocuklu Aile Karşılaması',
        description: 'Ailecek mağazaya gelen müşterileri çocukları ile birlikte profesyonelce karşılayın.',
        difficulty: 'EASY', xpReward: 15,
        customerContext: 'Yılmaz ailesi (anne, baba, 8 yaşında oğul). Oğlanın futbol kramponunu yenilemeye geldiler.',
        steps: [
            step('Aile mağazaya giriyor, çocuk hemen kramponlara koşuyor.', [
                c('Hoş geldiniz! Genç sporcumuza krampon mu bakıyoruz?', [3, 1, 0, 1], 'Çocuğa hitap + sıcak karşılama.', true),
                c('Hoş geldiniz, yardımcı olabilir miyim?', [1, 0, 0, 0], 'Genel ve sıkıcı.'),
                c('Çocuğa: "Kaç yaşındasın bakalım?"', [2, 0, 0, 0], 'Sevimli ama ebeveynleri es geçtin.'),
                c('Sessizce yaklaşıp bekle.', [0, 0, 0, 0], 'Aktif değilsin.'),
            ]),
            step('Baba: "Halı sahada oynuyor, dayanıklı bir krampon lazım."', [
                c('Halı saha için HG taban en uygun — kayma riski az. Numarasını alıp 2 model getireyim.', [2, 3, 1, 2], 'Teknik bilgi + aksiyon.', true),
                c('En pahalı modelimiz var.', [0, 1, 1, 1], 'Bilgisiz öneri.'),
                c('Bütçeniz ne kadar?', [1, 0, 0, 1], 'Önce ihtiyaç, sonra bütçe.'),
                c('Hangi marka olsun?', [1, 1, 0, 0], 'Önce kullanım koşulu sormalıydın.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Profesyonel Sporcu Karşılaması',
        description: 'Performans odaklı ileri seviye sporcuyu nasıl karşılarsın?',
        difficulty: 'HARD', xpReward: 30,
        customerContext: 'Selim Bey, 32, triatlet. Bisiklet+koşu+yüzme için ürün arıyor. Teknik konuşmayı seviyor.',
        steps: [
            step('Müşteri kararlı adımlarla içeri giriyor.', [
                c('Hoş geldiniz Selim Bey, triatlon hazırlığınız için mi geldiniz?', [3, 2, 1, 1], 'Sadakat kartı ile tanımak harika.', true),
                c('Hoş geldiniz, ne istediğinizi biliyor musunuz?', [0, 0, 0, 0], 'Soğuk ve sorgulayıcı.'),
                c('Hoş geldiniz, bakınmak ister misiniz?', [1, 0, 0, 0], 'Profesyonele uymaz.'),
                c('Bugün hangi kategoride bakıyorsunuz?', [2, 1, 1, 1], 'Direkt ve profesyonel.'),
            ]),
            step('"Maraton ayakkabısı bakıyorum, sub-3 hedefliyorum."', [
                c('Sub-3 ciddi performans. Karbon plakalı, hafif yüksek yığma modeli önerebilirim. Cadence ölçümünüz var mı?', [2, 3, 2, 3], 'Teknik diyalog + ileri seviye sorular.', true),
                c('Vay be, zorlu hedef. Şu modeli deneyin.', [1, 1, 0, 1], 'Hayranlık ama bilgi zayıf.'),
                c('Sub-3 için ekstra antrenman lazım.', [0, 0, 0, 0], 'Müşterinin işine karışma.'),
                c('Tüm karbon plakalı modelleri çıkarıyorum karşılaştıralım.', [2, 3, 1, 2], 'Profesyonel yaklaşım.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'İlk Defa Spor Yapacak Müşteri',
        description: 'Hayatında ilk kez düzenli spora başlayan birini doğru ürünlere yönlendirin.',
        difficulty: 'EASY', xpReward: 15,
        customerContext: 'Aysel Hanım, 48, doktoru spor yapması gerektiğini söylemiş. Hiçbir spor ekipmanı yok.',
        steps: [
            step('"Hiç spor yapmadım, neye ihtiyacım var bilmiyorum."', [
                c('Endişelenmeyin, beraber adım adım gidelim. Önce ne tür spor yapmayı planlıyorsunuz?', [3, 2, 1, 1], 'Empati + rehberlik.', true),
                c('Tabii, başlangıç paketimiz var.', [1, 1, 2, 1], 'Bilgi vermeden paket sattın.'),
                c('Çok geç değil, başlamak güzel.', [2, 0, 0, 0], 'Sıcak ama yönlendirmesiz.'),
                c('Hepsi var bizde, ne istersiniz?', [0, 0, 0, 0], 'Soyut.'),
            ]),
            step('"Doktor yürüyüş önerdi, dizlerime iyi gelecek bir şey."', [
                c('Dizleri koruyan yastıklı yürüyüş ayakkabısı + rahat eşofman önerebilirim. Numara ölçelim mi?', [3, 3, 2, 2], 'Detaylı çözüm, aksiyon önerisi.', true),
                c('Yürüyüş ayakkabısı bölümümüze geçelim.', [1, 1, 0, 1], 'Yetersiz açıklama.'),
                c('Hangi rengi seversiniz?', [1, 0, 0, 0], 'Renk değil, ihtiyaç öncelikli.'),
                c('Sabah mı akşam mı yürüyeceksiniz?', [1, 0, 0, 0], 'Önemsiz soru.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Karşılama Sırasında Sorun Çıkaran Müşteri',
        description: 'Memnuniyetsiz, eleştirel girişli müşteri ile pozitif ton kurun.',
        difficulty: 'HARD', xpReward: 30,
        customerContext: 'Hakan Bey homurdanarak içeri giriyor: "Geçen sefer hizmet beğenmemiştim, görelim bakalım."',
        steps: [
            step('"Geçen sefer hiç yardımcı olunmadı, umarım bugün farklı olur."', [
                c('Yaşadığınız için çok üzgünüm. Bugün size en iyi hizmeti vermek için buradayım. Aradığınız nedir?', [3, 1, 0, 2], 'Empati + pozitif yeniden başlangıç.', true),
                c('Geçen sefer kimle muhatap oldunuz?', [0, 0, 0, 0], 'Savunmacı, suçlayıcı.'),
                c('Bugün şanslı günümüzdesiniz.', [0, 0, 0, 1], 'Önemsiz, samimiyetsiz.'),
                c('Şikayet kutusu kapıda.', [0, 0, 0, 0], 'Felaket — müşteri kaybedildi.'),
            ]),
            step('Müşteri sakinleşti, "Şişme mont arıyorum" dedi.', [
                c('Harika, kullanım amacınızı sorabilir miyim — şehirde mi, dağda mı?', [2, 3, 0, 2], 'Uygun ihtiyaç analizi.', true),
                c('Şişme montlar burada, beğendiğinizi söyleyin.', [1, 0, 0, 1], 'Pasif yaklaşım.'),
                c('En sıcak modeli getireyim.', [1, 1, 0, 1], 'Bilgi olmadan ürün önerdin.'),
                c('İndirimli ürünlerimiz var, bakalım mı?', [1, 1, 1, 2], 'Erken indirim teklifi.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Telefonla Yönlendirilmiş Müşteri',
        description: 'Telefonda görüştüğü ürünü almak için gelen müşteriyi karşılayın.',
        difficulty: 'MEDIUM', xpReward: 20,
        customerContext: 'Esra Hanım: "Sabah aradım, mavi koşu tişörtü için yer ayırttınız."',
        steps: [
            step('Müşteri kapıdan girer girmez bunu söylüyor.', [
                c('Esra Hanım hoş geldiniz, sizi bekliyordum. Ürünü hazırladım.', [3, 2, 0, 3], 'Profesyonel + müşteri özel hissettirdin.', true),
                c('Kim ayırttı bilmiyorum, kasada sorayım.', [0, 0, 0, 0], 'Felaket — koordinasyon sıfır.'),
                c('Tişörtler reyonda, gidip bakalım.', [1, 0, 0, 1], 'Hazırlığın eksikliği belli.'),
                c('Hoş geldiniz, hangi ürün olduğunu bir daha söyler misiniz?', [1, 0, 0, 0], 'Notları kontrol etmeliydin.'),
            ]),
            step('Tişörtü teslim etmek üzeresin.', [
                c('Bu tişörte mükemmel uyan tayt-şort kombinasyonumuz da yeni geldi, kombin oluşturmak ister misiniz?', [2, 2, 3, 2], 'Çapraz satış fırsatı.', true),
                c('Buyrun, kasaya geçelim.', [1, 0, 0, 2], 'Hızlı ama satış fırsatı kaçtı.'),
                c('Tişört uygun mu, denemek ister misiniz?', [2, 1, 0, 1], 'İyi bir öneri.'),
                c('Kart ile mi nakit ile mi ödeyeceksiniz?', [0, 0, 0, 1], 'Çok agresif kapanış.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Hediye Almaya Gelen Müşteri',
        description: 'Sevdiği kişiye hediye almak isteyen ama detay bilmeyen müşteriye yardımcı olun.',
        difficulty: 'MEDIUM', xpReward: 20,
        customerContext: 'Mert Bey: "Eşime doğum günü hediyesi alacağım, spor yapıyor ama çok detay bilmiyorum."',
        steps: [
            step('Müşteri tereddütlü görünüyor.', [
                c('Süper bir jest! Eşinizin hangi sporu yaptığını ve numarasını biliyor musunuz?', [3, 2, 0, 1], 'Doğru sorular, samimi.', true),
                c('Bizde hediye paketi seçenekleri var, gösterelim.', [1, 1, 1, 1], 'Acele hediye paketi.'),
                c('Spor saatlerimiz çok popüler hediye.', [1, 1, 2, 2], 'Ürün önermek için erken.'),
                c('Numarasını mutlaka bilmelisiniz.', [0, 0, 0, 0], 'Suçlayıcı.'),
            ]),
            step('"Pilates yapıyor, 38 numara giyiyor sanırım."', [
                c('Mükemmel — pilates için yoga matı seti, tayt ve top hediyesi kombinleyebiliriz. Bütçenize göre üç seçenek hazırlayayım.', [2, 3, 3, 3], 'Paket yaklaşımı + esneklik.', true),
                c('Tayt güzel hediye olur, bakalım.', [1, 1, 1, 1], 'Sade ama düz öneri.'),
                c('Yanlış numara olursa iade hakkı var, rahat olun.', [2, 1, 0, 2], 'İyi güvence ama satışı bitirmedin.'),
                c('Hediye sertifikası alın, kendi seçsin.', [1, 0, 0, 0], 'Sürpriz olmaz, yanlış öneri.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Mağaza Tanıtım Turu',
        description: 'İlk kez gelen müşteriye mağaza ve markaları tanıtın.',
        difficulty: 'EASY', xpReward: 15,
        customerContext: 'Genç bir müşteri: "Buraya ilk kez geliyorum, hangi markalar var?"',
        steps: [
            step('"Hangi markalarınız var?"', [
                c('The North Face, Salomon, Columbia ve daha 10+ marka. Ne tür ürün ilgilendiriyor, oraya gidelim?', [2, 3, 1, 2], 'Bilgi + yönlendirme.', true),
                c('Tüm büyük markalar var, gezin.', [1, 0, 0, 0], 'Yetersiz.'),
                c('Hangi marka istiyorsunuz?', [0, 1, 0, 0], 'Soğuk.'),
                c('Web sitemize bakabilirsiniz.', [0, 0, 0, 0], 'Mağazadan uzaklaştırdın.'),
            ]),
            step('"Outdoor için bakıyorum, kamp ve doğa yürüyüşü."', [
                c('Mükemmel! Outdoor reyonumuz şu tarafta — North Face ve Salomon outdoor uzmanları. Önce kullanacağınız mevsimi sorabilir miyim?', [3, 3, 2, 2], 'Detaylı yönlendirme + mevsim sorgusu.', true),
                c('Şu tarafta outdoor ürünler.', [1, 1, 0, 1], 'Düz yönlendirme.'),
                c('Hangi sezon kullanacaksınız?', [2, 2, 0, 1], 'Doğru soru ama tek başına yetersiz.'),
                c('Tüm outdoor ürünleri görmek ister misiniz?', [1, 1, 1, 1], 'Genel.'),
            ]),
        ],
    });
};
