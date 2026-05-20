// 15 senaryo — İtiraz Karşılama
module.exports = function (out, step, c) {
    const CAT = 'ITIRAZ';

    out.push({
        category: CAT, title: 'Fiyat İtirazı: "Bu Fiyata Değmez"',
        description: 'Beğendiği ürünün fiyatını yüksek bulan müşteriye değer iletme.',
        difficulty: 'MEDIUM', xpReward: 25,
        customerContext: 'Hakan Bey spor ceketini beğeniyor ama fiyatı görünce "Bu fiyata değmez" diyor.',
        steps: [
            step('"Bu fiyata değmez."', [
                c('Anlıyorum, fiyat önemli. Bu ceketi neden seçtiğinizi öğrenebilir miyim?', [3, 2, 0, 1], 'İtiraz kabul + değer keşfi.', true),
                c('Marka kaliteli, normal fiyat.', [0, 1, 0, 0], 'Savunmacı.'),
                c('Ucuz model göstereyim.', [1, 1, 0, 1], 'Hızlı geri çekildin.'),
                c('İndirim yapayım, kaça olur?', [1, 0, 0, 1], 'Pazarlık modu.'),
            ]),
            step('"Dağ yürüyüşü için, su geçirmez olmalı."', [
                c('Mükemmel — 10.000 mm su geçirmezlik, Primaloft yalıtım, 5 yıl garanti. Ucuz alternatif 1 sezon dayanır.', [2, 3, 1, 3], 'Özellik-fayda-maliyet.', true),
                c('Su geçirmiyor, sizin için ideal.', [1, 2, 0, 2], 'Yetersiz detay.'),
                c('Çok satıyor.', [0, 0, 0, 0], 'Sosyal kanıt zayıf.'),
                c('Garantisi var, sorun çıkmaz.', [1, 1, 0, 1], 'Tek argüman.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'İnternet Daha Ucuz İtirazı',
        description: 'Müşteri "Aynısı internette daha ucuz" diyor.',
        difficulty: 'MEDIUM', xpReward: 25,
        customerContext: 'Müşteri telefondan fiyat karşılaştırması yapıyor.',
        steps: [
            step('"İnternette aynısı 800 TL daha ucuz."', [
                c('Doğru bilgi. Bizden alırsanız: 14 gün koşulsuz iade, mağazada deneme, uzman desteği, hediye paketleme. Sahte risk de yok.', [2, 3, 1, 3], 'Mağaza değeri.', true),
                c('Olabilir, alacaksanız alın.', [0, 0, 0, 0], 'Vazgeçtin.'),
                c('İnternette sahte çıkabilir.', [1, 1, 0, 1], 'Argüman zayıf, korkutucu.'),
                c('Aynı fiyatı verebilirim.', [1, 0, 0, 2], 'Hemen indirim hatalı.'),
            ]),
            step('"Yine de fark çok, düşünmeliyim."', [
                c('Anlıyorum. Bugün alırsanız bu kuponu ve uzun ömürlü bakım sprayını hediye edeyim — internette bunlar yok.', [2, 2, 2, 3], 'Sadece-mağaza avantajı.', true),
                c('Tabii, internetten alın.', [0, 0, 0, 0], 'Felaket.'),
                c('Düşünün, yarın gelin.', [2, 0, 0, 0], 'Satışı kaçırdın.'),
                c('İndirim olmayacak, son fiyat.', [0, 0, 0, 1], 'Agresif.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: '"Düşüneyim" İtirazı',
        description: 'Müşteri karar veremiyor ve "düşüneyim" diyor.',
        difficulty: 'EASY', xpReward: 20,
        customerContext: 'Müşteri ürünü beğendi ama satın almakta tereddütlü.',
        steps: [
            step('"Düşüneyim, sonra gelirim."', [
                c('Tabii, hangi konuda tereddütlüsünüz? Belki yardımcı olabilirim.', [3, 1, 1, 2], 'İtirazın altını araştırdın.', true),
                c('Tabii, görüşürüz.', [1, 0, 0, 0], 'Müşteri muhtemelen dönmez.'),
                c('Hemen alın, stok kalmıyor.', [0, 0, 0, 2], 'Baskı yarattın.'),
                c('Telefon bırakın, ararım.', [1, 0, 0, 1], 'Pasif.'),
            ]),
            step('"Fiyatından çok emin değilim."', [
                c('Anladım. 6 taksit seçeneğimiz var, ayda 350 TL gibi. Bütçenize uygunsa karar kolaylaşır mı?', [2, 2, 2, 3], 'Finansman çözümü.', true),
                c('İstediğiniz gibi düşünün.', [1, 0, 0, 0], 'Pasif.'),
                c('Yarın indirim olabilir.', [0, 0, 0, 1], 'Tutarsız mesaj.'),
                c('Pahalı değil aslında.', [0, 1, 0, 0], 'Anlamsız.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Eşim/Param Olmadan Karar Veremem',
        description: 'Müşteri eşinin/onayının olmadığı için karar veremiyor.',
        difficulty: 'MEDIUM', xpReward: 25,
        customerContext: 'Müşteri: "Eşime sormam lazım, bu kadarına onay verir mi bilmem."',
        steps: [
            step('Eş onayı bahanesi.', [
                c('Anlıyorum, beraber karar vermek güzel. Görüntülü arayıp gösterebilirsiniz, beraber inceleyelim.', [3, 1, 1, 2], 'Yaratıcı çözüm.', true),
                c('Eşinizi getirin.', [1, 0, 0, 1], 'Soğuk.'),
                c('Sonra gelirsiniz.', [0, 0, 0, 0], 'Satış kaybı.'),
                c('Eşinizden gizli alın.', [0, 0, 0, 1], 'Etik dışı.'),
            ]),
            step('Eş arandı, onaylamadı.', [
                c('Anlıyorum. 14 gün iade hakkımız var — denemek için alıp evde gösterebilirsiniz, beğenmezse iade.', [3, 2, 2, 3], 'Risksiz teklif.', true),
                c('Maalesef, gelin yine.', [1, 0, 0, 0], 'Pasif.'),
                c('Eşinize zorla kabul ettirin.', [0, 0, 0, 0], 'Felaket.'),
                c('Ucuz model deneyelim.', [1, 1, 1, 1], 'Değer düşürdün.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Marka Şüphesi: "Bu Markayı Bilmiyorum"',
        description: 'Müşteri bilmediği markaya güvenmiyor.',
        difficulty: 'MEDIUM', xpReward: 25,
        customerContext: 'Müşteri: "Bu markayı hiç duymadım, kalitesinden emin değilim."',
        steps: [
            step('Marka tanımıyor.', [
                c('Haklı sorgulama. Bu marka Almanya kökenli, 30+ yıl outdoor uzmanı. Mağazamızda en az iade alan markalardan biri.', [2, 3, 0, 2], 'Köken + iade istatistiği.', true),
                c('Çok satan bir marka.', [0, 1, 0, 1], 'Argüman zayıf.'),
                c('Bilinen markaya yönelelim.', [1, 0, 0, 1], 'Geri çekildin.'),
                c('Deneyin, beğenirsiniz.', [1, 0, 0, 1], 'Sebepsiz.'),
            ]),
            step('"Bilinen markadan biraz pahalı olsa fark eder mi?"', [
                c('Aslında bu marka aynı performansı %20 daha uygun fiyatla veriyor. Pazarlamaya az bütçe ayırıyorlar, ürüne yatırım yapıyorlar.', [2, 3, 1, 3], 'Maliyet-performans.', true),
                c('Bilinen markayı alın, içiniz rahat olur.', [1, 0, 0, 1], 'Markaya zarar.'),
                c('Hepsi aynı zaten.', [0, 0, 0, 0], 'Sıradan.'),
                c('Tabii fark eder.', [0, 1, 0, 0], 'Yanlış.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Renk/Beden İtirazı',
        description: 'Beden veya renk tükendiğinde müşteri itiraz ediyor.',
        difficulty: 'EASY', xpReward: 20,
        customerContext: 'Müşteri istediği rengi bulamıyor: "Sadece bu renkler mi?"',
        steps: [
            step('Renk sınırlı.', [
                c('O renk tükenmiş ama diğer şubelerden 1 günde getirebilirim. İstediğiniz adrese de gönderilebilir.', [2, 2, 1, 3], 'Çözüm + esneklik.', true),
                c('Maalesef, kalan bu kadar.', [0, 0, 0, 0], 'Pasif.'),
                c('Başka renk deneyin.', [1, 0, 0, 1], 'Müşteriyi yormak.'),
                c('Yeni sezonda gelir.', [0, 0, 0, 0], 'Yetersiz.'),
            ]),
            step('"Acil lazım, 1 gün bekleyemem."', [
                c('Anladım. Aynı modelin benzer ton siyahı mevcut — denemek ister misiniz? Yan rafta da yakın model var.', [2, 2, 2, 2], 'Alternatif sundun.', true),
                c('Maalesef bizde yok.', [0, 0, 0, 0], 'Satış kaybı.'),
                c('Acil lazımsa ne yapalım?', [0, 0, 0, 0], 'Aksi cevap.'),
                c('Daha sonra gelin.', [0, 0, 0, 0], 'Felaket.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Geçen Sene Daha Ucuzdu',
        description: 'Müşteri fiyat artışından şikayetçi.',
        difficulty: 'MEDIUM', xpReward: 25,
        customerContext: '"Aynı ürünü geçen sene yarı fiyata almıştım, ne oldu?"',
        steps: [
            step('Fiyat artışı şikayeti.', [
                c('Ham madde ve döviz etkilerini biliyorsunuz. Ama bu sezon teknoloji iyileşti — eski modelin %30 daha iyi performans veriyor.', [2, 3, 0, 2], 'Bağlam + değer.', true),
                c('Her yerde böyle, normal.', [0, 0, 0, 0], 'Sıradan.'),
                c('Dolar yüzünden.', [0, 1, 0, 0], 'Tek nedenli.'),
                c('Eski stok kalmadı.', [1, 1, 0, 1], 'Bilgi az.'),
            ]),
            step('"O zaman geçen seneki modeli verin."', [
                c('Outlet bölümümüzde geçen sezon ürünleri %40 indirimli — gösterelim mi?', [2, 2, 2, 3], 'Pratik çözüm.', true),
                c('Stoğumuzda yok.', [0, 0, 0, 0], 'Yetersiz.'),
                c('Yeni alın, daha iyi.', [1, 1, 1, 1], 'Tartışmacı.'),
                c('Kontrol edeyim.', [1, 1, 0, 1], 'Belirsiz.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Ürünü Beğendi Ama "Bana Yakışmadı"',
        description: 'Müşteri ayna karşısında "Bana yakışmamış" diyor.',
        difficulty: 'MEDIUM', xpReward: 25,
        customerContext: 'Müşteri spor ceketini denedi ama beğenmedi: "Bana yakışmamış."',
        steps: [
            step('"Bana yakışmamış."', [
                c('Aslında size çok yakıştı — ama farklı bir kesim arıyorsanız slim-fit modelini deneyebiliriz.', [2, 1, 1, 2], 'Onaylama + alternatif.', true),
                c('Tabii, başka model.', [1, 0, 0, 0], 'Tartışmasız.'),
                c('Yakışmış, satın alın.', [0, 0, 0, 1], 'Israrcı.'),
                c('Hangi konuda rahatsızsınız?', [3, 1, 0, 1], 'İyi soru ama eksik.'),
            ]),
            step('"Omuzlar çok geniş duruyor."', [
                c('Anladım, bir beden küçüğü deneyelim — daha oturmuş duracak. Aynı modelin daralan kesimi de var.', [2, 2, 1, 3], 'Çözüm önerisi.', true),
                c('Aslında trend bu.', [0, 1, 0, 0], 'Müşteriye dayatma.'),
                c('Tabii, bakacaksanız.', [1, 0, 0, 0], 'Pasif.'),
                c('İade getirebilirsiniz sonra.', [1, 0, 0, 1], 'Erken iade önerisi.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: '"Gerekli mi Gerçekten?" İtirazı',
        description: 'Müşteri ürünün gerekliliğini sorguluyor.',
        difficulty: 'EASY', xpReward: 20,
        customerContext: 'Yeni başlayan koşucuya kompresyon çorabı önerdiniz, "Gerekli mi?" diyor.',
        steps: [
            step('Gereklilik şüphesi.', [
                c('Zorunlu değil ama uzun mesafede toparlanmayı hızlandırır, baldır ağrısını azaltır. Düzenli koşacaksanız çok faydalı.', [2, 3, 1, 1], 'Dürüst + fayda.', true),
                c('Tabii ki gerekli.', [0, 1, 1, 1], 'Dayatma.'),
                c('Almasanız da olur.', [0, 0, 0, 0], 'Satışı sen kaybettin.'),
                c('Profesyoneller hep takar.', [1, 1, 1, 1], 'Sosyal baskı.'),
            ]),
            step('"Daha sonra alırım belki."', [
                c('Tabii, ihtiyaç hissettiğinizde dönüş yapın. Bu arada bir tanesini deneyin diye sample da verebilirim.', [3, 1, 2, 2], 'Tek-pakette deneme.', true),
                c('Şimdi alın, indirim var.', [1, 0, 1, 2], 'Israrcı.'),
                c('Tamam, sonra.', [1, 0, 0, 0], 'Vazgeçtin.'),
                c('Sonra fiyat artabilir.', [0, 0, 0, 1], 'Korkutucu.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Eski Modeli İstiyor İtirazı',
        description: 'Müşteri eski model arıyor, yenisi farklı.',
        difficulty: 'MEDIUM', xpReward: 25,
        customerContext: '"Geçen yılki modeli almıştım, çok memnundum, aynısını istiyorum."',
        steps: [
            step('Eski model talebi.', [
                c('O modelin sadık kullanıcısı olmanız çok güzel. Yeni versiyonda kalıp aynı, taban %20 daha hafif. Yan yana deneyebilirsiniz.', [3, 3, 1, 2], 'Süreklilik + iyileşme.', true),
                c('Eski model üretilmiyor.', [0, 1, 0, 1], 'Tek cümle.'),
                c('Yenisi daha iyi, alın.', [1, 1, 1, 2], 'Israrcı.'),
                c('Outlet\'te bulabilirsiniz.', [1, 1, 0, 1], 'Satış kaybı.'),
            ]),
            step('"Yenisi farklı hissedebilir."', [
                c('Anlıyorum. Birkaç adım deneyin, fark olursa eski modelden depo aramaması yapabilirim.', [2, 2, 1, 3], 'Esneklik.', true),
                c('Alışırsınız, sorun yok.', [1, 1, 0, 1], 'Dayatma.'),
                c('Maalesef eski yok.', [0, 0, 0, 0], 'Yetersiz.'),
                c('Başka modele bakalım.', [1, 1, 0, 1], 'Satışı kaybettin.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Yorum Şüphesi: "İnternette Kötü Yorum Var"',
        description: 'Müşteri internette gördüğü olumsuz yorumdan etkilenmiş.',
        difficulty: 'HARD', xpReward: 30,
        customerContext: '"Bu modelin tabanı çabuk aşınıyor diye yazılmış."',
        steps: [
            step('Olumsuz yorum.', [
                c('İyi araştırmışsınız. O yorumlar genelde günde 20+ km koşan profesyonel kullanıcıdan. Normal kullanımda ortalama 800 km dayanır.', [2, 3, 1, 2], 'Bağlam açıkladın.', true),
                c('Yorumlar her zaman doğru değil.', [0, 1, 0, 1], 'Savunmacı.'),
                c('Sahte yorum olabilir.', [0, 0, 0, 0], 'Markayı koruyamadın.'),
                c('Benim daha çok dayandı.', [1, 1, 0, 1], 'Kişisel deneyim zayıf.'),
            ]),
            step('"Yine de risk almak istemiyorum."', [
                c('Anlıyorum. Bu modelin 60 günlük performans garantisi var — koşunuz beklentinizi karşılamazsa para iadesi.', [2, 2, 1, 3], 'Risk-azaltıcı garanti.', true),
                c('Başka model gösterelim.', [1, 1, 0, 1], 'Geri çekildin.'),
                c('Sizinki haklı.', [0, 0, 0, 0], 'Felaket.'),
                c('Birkaç hafta deneyin, sonra karar verin.', [2, 1, 0, 2], 'Belirsiz vaat.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Garanti Soru İşareti',
        description: '"Bu garanti gerçekten geçerli mi?"',
        difficulty: 'EASY', xpReward: 20,
        customerContext: 'Müşteri garanti politikasından emin değil.',
        steps: [
            step('Garanti şüphesi.', [
                c('Garanti tamamen geçerli — fiş + ürün ile her şubeden iade/değişim. 14 gün koşulsuz, 2 yıl üretim hatası.', [2, 3, 0, 3], 'Net koşullar.', true),
                c('Tabii, her şey garantili.', [1, 1, 0, 1], 'Genel.'),
                c('Yazıyor zaten.', [0, 0, 0, 0], 'Soğuk.'),
                c('Müşteri hizmetleri bakar.', [0, 0, 0, 0], 'Sorumluluk reddi.'),
            ]),
            step('"Online aldığım da burada iade edilir mi?"', [
                c('Evet, mağazadan iade hakkımız var. Online numaranız + ürün yeterli.', [2, 3, 0, 3], 'Çoklu kanal.', true),
                c('Sanırım edilir.', [0, 1, 0, 0], 'Belirsiz.'),
                c('Online ayrı, kargo ile gönderin.', [1, 1, 0, 1], 'Yanlış bilgi.'),
                c('Bilmiyorum.', [0, 0, 0, 0], 'Yetersiz.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Hediye Olduğu İçin Karar Veremiyor',
        description: 'Müşteri hediye için karar vermekte zorlanıyor.',
        difficulty: 'MEDIUM', xpReward: 25,
        customerContext: 'Müşteri arkadaşına hediye seçiyor: "Beğenmezse ne olur?"',
        steps: [
            step('Beğenme endişesi.', [
                c('Hediye fişi koyarsak, beğenmezse 14 gün içinde değiştirebilir. Sürpriz bozulmadan iade hakkı.', [3, 2, 1, 3], 'Risksiz hediye.', true),
                c('Eminim beğenir.', [1, 0, 0, 1], 'Garantisiz.'),
                c('Hediye kartı verin.', [1, 0, 0, 1], 'Sürpriz olmaz.'),
                c('İade edemez.', [0, 0, 0, 0], 'Yanlış bilgi.'),
            ]),
            step('"Tamam ama paketleme nasıl?"', [
                c('Mağazamızın özel hediye paketi ücretsiz — kurdele, kart, premium kutu hepsi dahil. İsim de yazdırabilirim.', [3, 2, 2, 3], 'Premium dokunuş.', true),
                c('Paketleyebiliriz.', [1, 1, 0, 1], 'Yetersiz.'),
                c('Ücretli paketleme var.', [0, 0, 0, 0], 'Caydırıcı.'),
                c('Naylon poşet yeterli.', [0, 0, 0, 0], 'Felaket.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Karısı/Kocası İstemiyor İtirazı',
        description: 'Müşteri "Eşim böyle pahalı şey almama izin vermez" diyor.',
        difficulty: 'MEDIUM', xpReward: 25,
        customerContext: 'Müşteri ürünü istiyor ama eşinin kızacağını söylüyor.',
        steps: [
            step('Eş baskısı.', [
                c('Anlıyorum. Bu ürün uzun vadeli yatırım — sağlığınız ve sporunuz için. Eşinizle taksitlerle anlaşmak daha kolay olabilir mi?', [3, 1, 1, 2], 'Empati + öneri.', true),
                c('Gizli alın, söylemeyin.', [0, 0, 0, 0], 'Etik dışı.'),
                c('Eşinizi getirin, beraber bakın.', [2, 1, 0, 1], 'İyi ama erken.'),
                c('Önemli değil, alın.', [0, 0, 0, 1], 'Profesyonel değil.'),
            ]),
            step('"Belki taksit ile alabilirim."', [
                c('Süper. 9 taksit imkanı var — ayda 380 TL. Banka aracılığıyla, ek faiz yok.', [2, 3, 1, 3], 'Net rakam + güven.', true),
                c('Taksit yapabiliriz.', [1, 1, 0, 1], 'Belirsiz.'),
                c('Faizsiz değildir.', [0, 1, 0, 0], 'Caydırıcı.'),
                c('Tüm bankalar kabul ediyor.', [1, 1, 0, 1], 'Yetersiz detay.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Personel Önerisini Reddetme',
        description: 'Müşteri önerinizi açıkça reddediyor.',
        difficulty: 'HARD', xpReward: 30,
        customerContext: 'Müşteri: "Bana satış yapmaya çalışıyorsun, başkasıyla konuşurum."',
        steps: [
            step('Direkt reddediliyorsun.', [
                c('Haklı bir tedirginlik. Amacım size doğru ürünü bulmak — başka renk veya marka da gösterebilirim, baskı yapmıyorum.', [3, 1, 0, 1], 'Empati + güven inşası.', true),
                c('Tabii, kolay gelsin.', [1, 0, 0, 0], 'Tamamen vazgeçtin.'),
                c('Yardım etmiyor muyum?', [0, 0, 0, 0], 'Savunmacı.'),
                c('Yöneticim ile konuşur musunuz?', [1, 0, 0, 0], 'Üst kademeye attın.'),
            ]),
            step('"Tamam, sadece izlemek istiyorum."', [
                c('Tabii, rahat olun. Bir sorunuz olursa yan rafta olacağım, çağırın yeter.', [3, 1, 0, 2], 'Alanı verdin ama hazırsın.', true),
                c('Sessizce takip edeyim.', [0, 0, 0, 0], 'Ürkütücü.'),
                c('Tamam, kolay gelsin.', [1, 0, 0, 0], 'Pasif.'),
                c('Ne istediğinizi söyleyin lütfen.', [0, 0, 0, 0], 'Israrcı.'),
            ]),
        ],
    });
};
