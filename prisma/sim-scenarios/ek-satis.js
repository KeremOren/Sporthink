// 11 senaryo — Ek Satış
module.exports = function (out, step, c) {
    const CAT = 'EK_SATIS';

    out.push({
        category: CAT, title: 'Koşu Ayakkabısı Sonrası Çapraz Satış',
        description: 'Bir koşu ayakkabısı alan müşteriye doğru çapraz satış yapın.',
        difficulty: 'EASY', xpReward: 15,
        customerContext: 'Esra Hanım koşu ayakkabısını seçti, kasaya yöneliyor.',
        steps: [
            step('Ek ürün önerisi.', [
                c('Yeni ayakkabınızın ömrünü uzatmak için nefes alan antibakteriyel çorap setimiz var. 3\'lü %20 indirimli.', [2, 3, 3, 2], 'Fayda + kampanya.', true),
                c('Çorap, t-shirt ya da şort?', [1, 0, 1, 1], 'Dağınık.'),
                c('Sadakat kartınız var mı?', [1, 1, 0, 1], 'Önce çapraz satış olmalı.'),
                c('Kasaya geçelim.', [1, 0, 0, 2], 'Fırsatı kaçırdın.'),
            ]),
            step('Müşteri çorabı kabul etti.', [
                c('Ayrıca koşu sırasında su şişesi + telefon kolluğu kombi var — pratik kullanım.', [2, 2, 3, 2], 'İkinci çapraz satış.', true),
                c('Bakım spreyi de var.', [1, 2, 2, 2], 'İyi çapraz satış.'),
                c('Başka gerek yok.', [1, 0, 0, 1], 'Pasif.'),
                c('Hızlı kasaya.', [0, 0, 0, 1], 'Aceleci.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Krampon Satışı Sonrası',
        description: 'Halı saha kramponu alan müşteriye doğru aksesuarları önerin.',
        difficulty: 'MEDIUM', xpReward: 20,
        customerContext: 'Müşteri halı saha kramponunu beğendi.',
        steps: [
            step('Çapraz satış zamanı.', [
                c('Halı saha çorabı, tekmelik ve form da gerekli — set olarak %15 avantajlı paketimiz var.', [2, 2, 3, 3], 'Paket teklifi.', true),
                c('Tekmelik almak ister misiniz?', [1, 2, 2, 1], 'Tek ürün, sebep yok.'),
                c('Krampon yeter, çıkın.', [0, 0, 0, 1], 'Felaket.'),
                c('Çanta da var, bakar mısınız?', [1, 1, 2, 1], 'İlgisiz.'),
            ]),
            step('"Tekmelik gerekli mi gerçekten?"', [
                c('Halı sahada bile sakatlık ihtimali yüksek — kaval kemiği darbeleri ciddi. Profesyonel maçta zorunlu, halı sahada da koruma için tavsiye.', [3, 3, 2, 2], 'Güvenlik bilgisi.', true),
                c('Tabii, mutlaka alın.', [0, 1, 1, 1], 'Sebep yok.'),
                c('İsterseniz almayın.', [1, 0, 0, 0], 'Kayıtsız.'),
                c('Çoğu oyuncu takıyor.', [1, 1, 1, 1], 'Sosyal kanıt zayıf.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Şişme Mont + Aksesuar',
        description: 'Outdoor mont alan müşteriye dağda ek ihtiyaçları sunun.',
        difficulty: 'MEDIUM', xpReward: 20,
        customerContext: 'Müşteri kış için şişme mont seçti.',
        steps: [
            step('Aksesuar fırsatı.', [
                c('Bu mont için bere + boyunluk + termal eldiven seti var — ekstrem soğukta 3\'lü koruma şart.', [2, 3, 3, 2], 'Kapsamlı kombin.', true),
                c('Bere ister misiniz?', [1, 1, 1, 1], 'Tek ürün.'),
                c('Kasaya geçelim.', [1, 0, 0, 1], 'Fırsat kaybı.'),
                c('Yün çorap da var.', [1, 1, 2, 1], 'Random.'),
            ]),
            step('"Eldivenim var aslında."', [
                c('Anlıyorum. Eldiveniniz su geçirmez mi? Outdoor için Gore-Tex eldiven gerekiyor — kuru kalmak hayati.', [2, 3, 2, 2], 'İhtiyaç sorgusu.', true),
                c('Yine de bir tane daha alın.', [0, 1, 1, 2], 'Israrcı.'),
                c('Tamam, geçelim.', [1, 0, 0, 1], 'Pasif.'),
                c('Yedek için lazım.', [1, 1, 1, 1], 'Argüman zayıf.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Bisiklet Forması Satışı Sonrası',
        description: 'Forma alan müşteriye uzun mesafe için diğer ihtiyaçları sunun.',
        difficulty: 'HARD', xpReward: 30,
        customerContext: 'Müşteri yarış forması seçti, granfondo planlıyor.',
        steps: [
            step('Aksesuar.', [
                c('Granfondo paketi: forma, şort (chamois), eldiven, çorap, gözlük. Set %20 indirimli, ayrı ayrı almaktan daha avantajlı.', [2, 3, 3, 3], 'Kapsamlı set.', true),
                c('Şort almak ister misiniz?', [1, 2, 2, 2], 'Tek ürün.'),
                c('Yeter sanırım.', [1, 0, 0, 1], 'Pasif.'),
                c('Bisiklet bakım malzemesi de var.', [1, 1, 2, 1], 'İlgili ama hedefli değil.'),
            ]),
            step('"Şortta chamois ne işe yarar?"', [
                c('Chamois oturma alanına özel jel yastık — 4 saatlik turda omurga ve oturma kasları için kritik. Olmadan sağlık riski.', [3, 3, 1, 3], 'Sağlık + bilgi.', true),
                c('Yumuşatır, rahatlık.', [1, 2, 1, 1], 'Yarı bilgi.'),
                c('Profesyoneller takıyor.', [1, 1, 1, 1], 'Argüman zayıf.'),
                c('Anlatması zor, deneyin.', [0, 0, 1, 1], 'Yetersiz.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Yoga Matı Aksesuar',
        description: 'Yoga matı alan müşteriye uygun ek ürünleri önerin.',
        difficulty: 'EASY', xpReward: 15,
        customerContext: 'Müşteri yoga matını seçti.',
        steps: [
            step('Ek ürün.', [
                c('Mat çantası, blok ve havlu seti %15 indirimli — yoga eşyaları için pratik.', [2, 2, 3, 2], 'Set teklifi.', true),
                c('Çanta lazım mı?', [1, 1, 1, 1], 'Sebep yok.'),
                c('Mat yeter.', [1, 0, 0, 1], 'Pasif.'),
                c('Foam roller bakar mısınız?', [1, 2, 2, 1], 'İlgisiz.'),
            ]),
            step('"Bloğa ihtiyacım var mı emin değilim."', [
                c('Esneklik geliştirme aşamasındaysanız blok pozları kolaylaştırır. Yeni başlayanlar çok seviyor.', [3, 3, 1, 2], 'Hedef + eğitim.', true),
                c('Çoğu kişi alıyor.', [1, 0, 1, 1], 'Sosyal baskı.'),
                c('Sonra alabilirsiniz.', [1, 0, 0, 0], 'Vazgeçtin.'),
                c('Tabii, mutlaka.', [0, 1, 1, 1], 'Sebepsiz.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Yüzme Gözlüğü Sonrası',
        description: 'Yüzme gözlüğü alan müşteriye diğer ekipmanları önerin.',
        difficulty: 'EASY', xpReward: 15,
        customerContext: 'Müşteri yüzme gözlüğünü seçti.',
        steps: [
            step('Ek satış.', [
                c('Kulak tıkacı, bone ve anti-fog spreyi setimiz var — gözlüğün ömrünü uzatır, kulak sağlığı korur.', [2, 3, 3, 2], 'Fayda odaklı.', true),
                c('Bone ister misiniz?', [1, 1, 1, 1], 'Tek ürün.'),
                c('Hızlı kasaya.', [0, 0, 0, 1], 'Fırsat kaybı.'),
                c('Mayoya bakacak mıydınız?', [1, 1, 2, 1], 'İlgili ama belirsiz.'),
            ]),
            step('"Bone gerçekten gerekli mi?"', [
                c('Çoğu havuz kuralı gereği zorunlu. Aynı zamanda saç klor zararından korunur.', [2, 3, 1, 2], 'Kural + sağlık.', true),
                c('Tabii, hep alın.', [0, 1, 1, 1], 'Sebepsiz.'),
                c('Almasanız da olur.', [1, 0, 0, 0], 'Vazgeçtin.'),
                c('Renk seçenekleri çok.', [1, 0, 1, 0], 'Yanlış argüman.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Tenis Raketi Sonrası',
        description: 'Yeni raket alan müşteriye uygun ekipmanları önerin.',
        difficulty: 'MEDIUM', xpReward: 20,
        customerContext: 'Müşteri raketini seçti.',
        steps: [
            step('Aksesuar.', [
                c('Yedek string, overgrip, dampener, kort ayakkabısı — tenis kiti olarak %15 avantajlı.', [2, 3, 3, 2], 'Tenis seti.', true),
                c('Overgrip almak ister misiniz?', [1, 2, 2, 1], 'Tek ürün.'),
                c('Yeter raket, çıkın.', [0, 0, 0, 1], 'Felaket.'),
                c('Top da lazım.', [1, 1, 2, 2], 'İyi ama eksik.'),
            ]),
            step('"Kort ayakkabısı şart mı?"', [
                c('Tenis ayakkabısı yanal hareketler için tasarlanmış — koşu ayakkabısıyla bilek sakatlık riski yüksek. Sağlık için kritik.', [3, 3, 2, 3], 'Güvenlik + bilgi.', true),
                c('Tabii şart.', [1, 1, 1, 1], 'Sebepsiz.'),
                c('İsterseniz alın.', [1, 0, 0, 0], 'Kayıtsız.'),
                c('Çoğu oyuncuda var.', [1, 1, 1, 1], 'Sosyal baskı.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Kayak Botu + Aksesuar',
        description: 'Kayak botu alan müşteriye sezon için ekipmanları önerin.',
        difficulty: 'HARD', xpReward: 30,
        customerContext: 'Müşteri kayak botunu seçti, profesyonel kayakçı.',
        steps: [
            step('Ek satış.', [
                c('Termal çorap, ısıtmalı iç bot, bakım kremi şart — sezon performansı için. Set olarak %20 avantajlı.', [2, 3, 3, 3], 'Profesyonel paket.', true),
                c('Termal çorap?', [1, 2, 2, 1], 'Tek ürün.'),
                c('Yeter.', [0, 0, 0, 1], 'Fırsat kaybı.'),
                c('Bot kılıfı da var.', [1, 1, 2, 1], 'İlgili.'),
            ]),
            step('"Bakım kremi nedir?"', [
                c('Kayak botunun deri kısmının çatlamasını önler, kalıbı korur. Sezon başı + sonu uygulanır. 1 botun ömrünü 2 katına çıkarır.', [2, 3, 1, 2], 'ROI mantığı.', true),
                c('Botu temizler.', [1, 1, 1, 1], 'Yetersiz açıklama.'),
                c('Bilmiyorum, etikete bakın.', [0, 0, 0, 0], 'Felaket.'),
                c('Sadece görsel.', [0, 0, 0, 0], 'Yanlış.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Sırt Çantası Sonrası Outdoor',
        description: 'Outdoor sırt çantası alan müşteriye doğru ek satışları yapın.',
        difficulty: 'MEDIUM', xpReward: 20,
        customerContext: 'Müşteri 65L sırt çantası seçti, çok günlük tur için.',
        steps: [
            step('Aksesuar.', [
                c('Yağmurluk kılıf, kompresyon torbası, su filtresi, baş lambası — çok günlük tur için temel kit.', [2, 3, 3, 2], 'Kit önerisi.', true),
                c('Kılıf ister misiniz?', [1, 2, 2, 1], 'Tek ürün.'),
                c('Çanta yeter.', [0, 0, 0, 1], 'Pasif.'),
                c('Çadır da var.', [1, 1, 2, 1], 'İlgisiz hızlı geçiş.'),
            ]),
            step('"Su filtresi gerçekten lazım mı?"', [
                c('Doğada içme suyu güvencesi yok. Filtre 1L\'ye 5 saniyede içilebilir su sağlar — hayatınızı kurtarabilir. 3000+ kullanım dayanır.', [3, 3, 1, 3], 'Güvenlik + ekonomi.', true),
                c('Tabii, mutlaka.', [1, 1, 1, 2], 'Sebepsiz.'),
                c('Su şişesi yeter.', [0, 0, 0, 0], 'Yanlış.'),
                c('Profesyoneller alıyor.', [1, 1, 1, 1], 'Argüman zayıf.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Bayan Spor Sutyeni Sonrası',
        description: 'Sutyenden sonra uygun spor giyim ek satışı yapın.',
        difficulty: 'EASY', xpReward: 15,
        customerContext: 'Müşteri spor sutyenini seçti.',
        steps: [
            step('Ek satış.', [
                c('Üzerine yakışan tayt, üst ve taşıma çantası kombin olarak %15 avantajlı.', [2, 2, 3, 2], 'Kombin.', true),
                c('Tayt bakar mısınız?', [1, 1, 1, 1], 'Tek ürün.'),
                c('Kasa.', [0, 0, 0, 1], 'Pasif.'),
                c('Mevsime göre üst de var.', [1, 1, 2, 1], 'İlgili ama belirsiz.'),
            ]),
            step('"Tayt zaten var."', [
                c('Spor tayt mı, günlük mü? Yüksek bel performans için kritik — bel desteği fark eder.', [2, 3, 2, 2], 'İhtiyaç sorgusu.', true),
                c('Bir tane daha alın.', [0, 0, 1, 1], 'Israrcı.'),
                c('Tamam, geçelim.', [1, 0, 0, 0], 'Pasif.'),
                c('Yeni model var, deneyin.', [1, 1, 1, 1], 'Belirsiz.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Hediye Paketi Çapraz Satışı',
        description: 'Hediye almak isteyen müşteriye paket önerin.',
        difficulty: 'MEDIUM', xpReward: 20,
        customerContext: 'Müşteri tek bir ürünü hediye olarak aldı.',
        steps: [
            step('Hediye geliştirme.', [
                c('Tek ürün yerine küçük kit halinde paketleyelim — örn. ayakkabı + çorap + bakım spreyi. Daha bütün hediye.', [3, 2, 3, 2], 'Algı değişimi.', true),
                c('Hediye paketi var.', [1, 1, 1, 1], 'Sebepsiz.'),
                c('Sadece bu yeter.', [0, 0, 0, 1], 'Pasif.'),
                c('Kart koyabiliriz.', [2, 0, 0, 1], 'Eksik.'),
            ]),
            step('"Çorap eklemek garip kaçar mı?"', [
                c('Aksine — fonksiyonel set olarak premium algılanır. İyi marka çorap aslında pahalı, hediye olarak değerli.', [3, 2, 2, 3], 'Algı yönetimi.', true),
                c('Tabii kaçar, sadece ürün.', [0, 0, 0, 0], 'Felaket.'),
                c('Siz bilirsiniz.', [1, 0, 0, 0], 'Pasif.'),
                c('İndirimli olduğu için iyi.', [1, 0, 2, 1], 'Argüman zayıf.'),
            ]),
        ],
    });
};
