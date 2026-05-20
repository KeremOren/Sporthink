// 9 senaryo — İade / Şikayet
module.exports = function (out, step, c) {
    const CAT = 'IADE_SIKAYET';

    out.push({
        category: CAT, title: 'Yıkamada Renk Atan Tişört',
        description: 'Sinirli müşterinin renk atan ürün şikayetini yönetin.',
        difficulty: 'HARD', xpReward: 30,
        customerContext: 'Murat Bey çok sinirli, tişörtü 1 hafta önce almış, ilk yıkamada rengi atmış.',
        steps: [
            step('"Bu rezalet! Bir hafta önce aldım!"', [
                c('Çok üzgünüm bu yaşadığınız için. Hemen ben ilgileniyorum, bakabilir miyim?', [3, 1, 0, 2], 'Empati + sahiplenme.', true),
                c('Yıkama talimatına uydunuz mu?', [0, 1, 0, 0], 'Suçlayıcı.'),
                c('Müşteri hizmetleriyle görüşün.', [0, 0, 0, 0], 'Sorumluluk reddi.'),
                c('Fişiniz var mı?', [0, 1, 0, 1], 'Önce empati.'),
            ]),
            step('Üretim hatası tespit ettiniz.', [
                c('Üretim hatası, size hak veriyorum. Aynısını getireyim ya da iade isterseniz aynı gün hesabınıza yatırırız.', [3, 3, 1, 3], 'Sorumluluk + seçenek.', true),
                c('Mağaza puanı veririz.', [1, 1, 1, 2], 'Tercihini sormalıydın.'),
                c('Üretici firmaya bildireceğim.', [0, 1, 0, 0], 'Mağdur ettin.'),
                c('Yıkama hatası olmuş olabilir.', [0, 0, 0, 0], 'Felaket.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Sökülen Ayakkabı İadesi',
        description: 'Ayakkabısı 2 ayda söküldü, müşteri şikayetçi.',
        difficulty: 'MEDIUM', xpReward: 25,
        customerContext: 'Müşteri ayakkabısının 2 ayda taban dikişinin söküldüğünü söylüyor.',
        steps: [
            step('Ayakkabı sorunu.', [
                c('Beklenmedik bir durum, üzgünüm. Ürünü kontrol edelim — üretim hatası ise garanti kapsamında değişim yaparız.', [3, 2, 0, 2], 'Empati + süreç.', true),
                c('2 ay normal, geç değil.', [0, 0, 0, 0], 'Savunmacı.'),
                c('Hangi yerde kullandınız?', [1, 1, 0, 0], 'Suçlayıcı ton.'),
                c('Garanti süresinde olmalı.', [1, 1, 0, 1], 'Soğuk.'),
            ]),
            step('Üretim hatası onaylandı.', [
                c('Hemen değiştiriyorum. Beklediğiniz için %10 indirim kuponu da hediye edeyim.', [3, 2, 2, 3], 'Çözüm + jest.', true),
                c('Yeni getireyim.', [2, 1, 0, 2], 'Düz çözüm.'),
                c('Üretici onayı 7-10 gün sürer.', [0, 1, 0, 0], 'Bekleme süresi yarattın.'),
                c('Aynı modelden değil farklı.', [1, 1, 0, 1], 'Onay vermedin.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Hediye İade Talebi',
        description: 'Hediye edilen ürünü iade etmek isteyen müşteri.',
        difficulty: 'EASY', xpReward: 20,
        customerContext: 'Müşteri hediye edilmiş ürün ile geliyor, kendisine uymadığını söylüyor.',
        steps: [
            step('Hediye iadesi.', [
                c('Tabii, hediye fişi var mı? Yoksa son fiyatla mağaza puanı veya farklı bir ürünle değişim yapabiliriz.', [3, 3, 1, 3], 'Net seçenekler.', true),
                c('Hediyeleri iade etmiyoruz.', [0, 0, 0, 0], 'Yanlış bilgi.'),
                c('Veren kişi gelmeli.', [0, 0, 0, 0], 'Yetersiz prosedür.'),
                c('Hangi modeli istiyorsunuz?', [2, 1, 1, 2], 'Belirsiz.'),
            ]),
            step('"Daha pahalı bir ürün almak istiyorum."', [
                c('Mükemmel. Hediye değerini düşeriz, farkını ödersiniz. Yeni ürünü deneyelim mi?', [2, 2, 2, 3], 'Upgrade çözümü.', true),
                c('Aynı fiyatta olmalı.', [0, 1, 0, 1], 'Esnek değil.'),
                c('Olmaz, aynı ürün olmalı.', [0, 0, 0, 0], 'Yanlış.'),
                c('Mağaza müdürüne soralım.', [1, 0, 0, 0], 'Sorumluluğu ittin.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Yanlış Bilgilendirme Şikayeti',
        description: 'Müşteri "Bana yanlış bilgi verildi" diyor.',
        difficulty: 'HARD', xpReward: 30,
        customerContext: 'Müşteri "Bu mont su geçirmez demiştiniz, yağmurda ıslandım!"',
        steps: [
            step('Yanlış bilgi şikayeti.', [
                c('Çok özür dilerim. Bilgi karışıklığı için sorumluyum. Modeli inceleyip uygun bir çözüm bulalım.', [3, 1, 0, 2], 'Sahiplenme.', true),
                c('Yanlış anlatmış olabilir.', [0, 0, 0, 0], 'Meslektaşı sattın.'),
                c('Su geçirmez yazıyor etikette.', [0, 1, 0, 1], 'Müşteriye direnme.'),
                c('Etiketinde su geçirmez yazmıyor.', [0, 1, 0, 1], 'Suçlayıcı.'),
            ]),
            step('İnceleme sonucu: mont su itici, su geçirmez değil.', [
                c('Tamamen haklısınız. Su geçirmez bir model ile değişim yapalım, fark olursa hediye edeyim — bu hata bizim.', [3, 3, 1, 3], 'Tam sorumluluk + jest.', true),
                c('Aynı fiyat aralığında model değişimi yapalım.', [2, 2, 1, 2], 'Adil ama eksik.'),
                c('Standart iade prosedürü.', [1, 1, 0, 1], 'Sıradan.'),
                c('Sadece iade verebilirim.', [1, 1, 0, 1], 'Yetersiz.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Fişsiz İade',
        description: 'Müşteri fişi olmadan iade istiyor.',
        difficulty: 'MEDIUM', xpReward: 25,
        customerContext: 'Müşteri ürünü iade etmek istiyor ama fişi yok.',
        steps: [
            step('Fişsiz iade talebi.', [
                c('Fişiniz yoksa kredi kartı ekstresinden veya CRM kaydından izleyebiliriz. Telefon numaranızla bakayım.', [2, 3, 0, 3], 'Alternatif çözüm.', true),
                c('Fişsiz iade yok.', [0, 1, 0, 0], 'Katı.'),
                c('Müşteri hizmetlerini arayın.', [0, 0, 0, 0], 'İttin.'),
                c('Üzgünüm, prosedür dışı.', [1, 1, 0, 0], 'Esnek değil.'),
            ]),
            step('CRM\'de kayıt bulundu.', [
                c('Buldum, son fiyat üzerinden işlem yapıyorum. Tercihiniz iade mi, değişim mi?', [2, 2, 1, 3], 'Çözüm + seçenek.', true),
                c('İşleme alıyorum.', [1, 2, 0, 2], 'Hızlı ama soğuk.'),
                c('Müdür onayı gerekir.', [0, 1, 0, 0], 'Bürokrasi.'),
                c('Kart ile yapacağım.', [1, 1, 0, 2], 'Tercih sormalıydın.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Süresi Geçen İade',
        description: 'İade süresi geçmiş, müşteri yine de istiyor.',
        difficulty: 'HARD', xpReward: 30,
        customerContext: 'Müşteri 30 günlük iade süresi geçmiş, "Ama hiç kullanmadım" diyor.',
        steps: [
            step('Süre dışı iade.', [
                c('30 günü geçtiği için standart iade mümkün değil ama mağaza puanı olarak değer verebilirim — esneklik göstereyim.', [3, 2, 1, 3], 'Yaratıcı çözüm.', true),
                c('Süre geçti, iade olmaz.', [0, 1, 0, 0], 'Katı.'),
                c('Niye 30 günü geçtiniz?', [0, 0, 0, 0], 'Suçlayıcı.'),
                c('Müdürle konuşun.', [0, 0, 0, 0], 'İttin.'),
            ]),
            step('"Mağaza puanı işime yarar mı?"', [
                c('Tabii — sınırsız ürün için kullanabilirsiniz, son kullanım tarihi yok. İstediğinizde harcayın.', [2, 2, 2, 3], 'Pratik fayda.', true),
                c('Belki yarar.', [0, 1, 0, 0], 'Belirsiz.'),
                c('Bilemem.', [0, 0, 0, 0], 'Profesyonel değil.'),
                c('Önemli, alın.', [0, 0, 1, 1], 'Argüman yok.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Hatalı Beden — Kullanılmış',
        description: 'Müşteri hatalı beden almış ama bir kez giymiş.',
        difficulty: 'MEDIUM', xpReward: 25,
        customerContext: 'Müşteri ayakkabıyı 1 kez denedi, beden uymadı, etiketler yok.',
        steps: [
            step('Etiketsiz iade.', [
                c('Tabii değişim yapalım. Ayakkabıyı kontrol edip uygun bedeni getireyim. Etiketler şart değil — deneme normal.', [3, 3, 1, 3], 'Esnek + müşteri lehi.', true),
                c('Etiketsiz olmaz.', [0, 1, 0, 0], 'Katı.'),
                c('Yıkanmış mı?', [0, 0, 0, 0], 'Suçlayıcı.'),
                c('İade olmaz, sadece değişim.', [1, 1, 0, 1], 'Yarım çözüm.'),
            ]),
            step('"Aynısı yok, başka model alabilir miyim?"', [
                c('Tabii — fark olursa düşeriz/eklersiniz. Hangi modele bakmak istersiniz?', [2, 2, 2, 3], 'Esnek değişim.', true),
                c('Aynı kategoriden olmalı.', [1, 1, 0, 1], 'Sınır.'),
                c('Sadece aynı fiyatta.', [1, 1, 0, 1], 'Esnek değil.'),
                c('Olur ama biraz prosedür.', [1, 1, 0, 1], 'Caydırıcı.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Sosyal Medyadan Şikayet Tehdidi',
        description: 'Müşteri "Sosyal medyada paylaşacağım!" diye tehdit ediyor.',
        difficulty: 'HARD', xpReward: 30,
        customerContext: 'Müşteri kızgın, "Bu deneyimi sosyal medyada paylaşacağım!"',
        steps: [
            step('Şikayet tehdidi.', [
                c('Anlıyorum, çok bekledi ve yorumunuz çok değerli. Şu an çözüme odaklanalım — sorununuzu detaylıca anlatır mısınız?', [3, 1, 0, 2], 'Sakinleştirme + diyalog.', true),
                c('Lütfen paylaşmayın.', [0, 0, 0, 0], 'Yalvarmak.'),
                c('Müdürü çağırayım.', [1, 0, 0, 0], 'Üst kademeye attın.'),
                c('Mahkemeye gidin isterseniz.', [0, 0, 0, 0], 'Felaket.'),
            ]),
            step('Sorun çözüldü, müşteri sakinleşti.', [
                c('Bu deneyim için tekrar özür dilerim. Sizi memnun etmek için kişisel bir hediye paketi hazırlayayım. Tekrar bekleriz.', [3, 1, 2, 3], 'Telafi + sıcaklık.', true),
                c('Şimdi sosyal medya paylaşımı yok değil mi?', [0, 0, 0, 0], 'Sıkıştırma.'),
                c('Tamam, kolay gelsin.', [1, 0, 0, 1], 'Vasat.'),
                c('Memnun olmazsanız söyleyin.', [2, 0, 0, 1], 'Yetersiz.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Online Sipariş Hatalı Geldi',
        description: 'Online sipariş yanlış geldi, mağazaya getiriyor.',
        difficulty: 'EASY', xpReward: 20,
        customerContext: 'Müşteri online sipariş etti ama yanlış ürün gelmiş.',
        steps: [
            step('Yanlış ürün.', [
                c('Çok üzgünüm bu hata için. Hemen ben hallederim — siparişinizi kontrol edip doğrusunu hazırlatıyorum.', [3, 2, 0, 3], 'Sahiplenme.', true),
                c('Online destekle görüşün.', [0, 0, 0, 0], 'İttin.'),
                c('Yanlış mı geldi?', [1, 0, 0, 0], 'Belirsiz.'),
                c('Sipariş numarası nedir?', [1, 2, 0, 1], 'Doğru ama soğuk.'),
            ]),
            step('Doğru ürün stokta var.', [
                c('Doğru ürün burada — şimdi değişim yapıyorum. Yanlış olan için bekleme süreniz için %10 kupon da koyuyorum.', [3, 2, 2, 3], 'Çözüm + jest.', true),
                c('Hemen değişim yapıyorum.', [2, 2, 0, 3], 'Düz çözüm.'),
                c('Bir dahaki online siparişe dikkat.', [0, 0, 0, 0], 'Suçlayıcı.'),
                c('Yan rafa bakalım.', [1, 1, 0, 1], 'Belirsiz.'),
            ]),
        ],
    });
};
