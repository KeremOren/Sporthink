// 11 senaryo — Ürün Önerme
module.exports = function (out, step, c) {
    const CAT = 'URUN_ONERME';

    out.push({
        category: CAT, title: 'Marka Bilgisi Testi',
        description: 'Salomon outdoor ürünlerini doğru tanıtma.',
        difficulty: 'MEDIUM', xpReward: 20,
        customerContext: 'Müşteri: "Salomon iyi bir marka mı? Hiç deneyim yok."',
        steps: [
            step('Marka hakkında soru.', [
                c('Salomon Fransız markası, özellikle trail running ve outdoor ayakkabıda dünya lideri. Contagrip taban teknolojisi piyasada eşsiz.', [2, 3, 1, 2], 'Net teknik bilgi.', true),
                c('Evet iyidir, çok satıyor.', [1, 0, 0, 0], 'Bilgisiz.'),
                c('Bilmiyorum açıkçası, web sitesinden bakalım.', [0, 0, 0, 0], 'Profesyonellik sıfır.'),
                c('Bazıları sever bazıları sevmez.', [0, 0, 0, 0], 'Belirsiz.'),
            ]),
            step('"Trail running yapacağım, hangi modeli önerirsin?"', [
                c('Speedcross 6 favori — derin diş, agresif tutuş. Daha sade arıyorsanız Sense Ride 5 var. Bütçenize göre iki modeli karşılaştıralım mı?', [2, 3, 2, 3], 'İki seçenek + bilgi + kapanış.', true),
                c('Speedcross alın, en iyisi.', [1, 1, 0, 2], 'Tek model, sebep yok.'),
                c('En pahalısı en iyisi.', [0, 1, 0, 1], 'Hatalı yaklaşım.'),
                c('Hepsini deneyebilirsiniz.', [1, 0, 0, 0], 'Müşteriyi yordun.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Futbol Kramponlarında Zemin ve Materyal Seçimi',
        description: 'Halı sahada oynayan ancak profesyonel krampon isteyen müşteriye zemin uyumu ve malzeme farklarını anlatma.',
        difficulty: 'HARD', xpReward: 30,
        customerContext: 'Profesyonel oynamak isteyen genç oyuncu. Sadece halı sahada oynuyor ama "ciddi krampon" istiyor.',
        steps: [
            step('"Profesyonel krampon istiyorum, halı sahada oynuyorum."', [
                c('Profesyonel hissetmenizi anlıyorum. Ama halı saha için FG (çim) tabanı uygunsuz — diş sıkışır, sakatlık riski var. HG halı saha tabanı önereyim, üst kalite deri seçenekleri var.', [2, 3, 1, 2], 'Sakatlık uyarısı + alternatif.', true),
                c('FG kramponları en pahalısı, çok satıyor.', [0, 1, 1, 1], 'Yanlış zemin önerdin.'),
                c('Profesyonel olmak istiyorsanız çim tabanı alın.', [0, 0, 0, 1], 'Tehlikeli öneri.'),
                c('Hangi marka istersiniz?', [1, 0, 0, 0], 'Asıl konuyu atladın.'),
            ]),
            step('"Kanguru derisi nedir, normalden farkı?"', [
                c('Kanguru derisi çok ince ve hafif, ayağa "ikinci ten" hissi verir. Top kontrolünü artırır. Ancak bakım gerektirir. Sentetik üst alternatif de var, daha dayanıklı.', [2, 3, 2, 2], 'Avantaj-dezavantaj sundun.', true),
                c('Kanguru en iyisi, mutlaka alın.', [1, 1, 1, 2], 'Tek yönlü bilgi.'),
                c('Hayvan derisi işte, normal.', [0, 0, 0, 0], 'Bilgisiz cevap.'),
                c('Sentetik daha sağlam, onu alın.', [1, 1, 1, 1], 'Sıradan.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'İleri Teknoloji Koşu Ayakkabısı ve Membran Karması',
        description: 'Profesyonel bir koşucu olan müşterinin, Gore-Tex teknolojisi ve nefes alabilirlik arasındaki denge konusundaki teknik şüphelerini giderme.',
        difficulty: 'HARD', xpReward: 30,
        customerContext: '5+ yıllık koşucu, "Gore-Tex aldım ama ayağım terliyor, neden?" diye soruyor.',
        steps: [
            step('Gore-Tex şikayeti.', [
                c('Gore-Tex su geçirmez ama nefes alır — sıcak havada içeriden terleme dışarıya çıkarken yavaşlar. Yaz koşusunda mesh model daha uygun, kış için Gore-Tex idealdir.', [2, 3, 1, 2], 'Doğru teknik açıklama.', true),
                c('Gore-Tex zaten terletir, normal.', [0, 1, 0, 0], 'Yarı doğru, eksik.'),
                c('Yanlış numara olabilir.', [0, 0, 0, 0], 'Konuyu saptırdın.'),
                c('Hangi koşullarda terliyor söyleyin.', [2, 2, 0, 1], 'İyi soru ama açıklama eksik.'),
            ]),
            step('"Yazlık model önerir misin?"', [
                c('Mesh üstlü, hafif kalıplı bir model — örn. Saucony Endorphin Speed 4. Hava sirkülasyonu üst düzey, performans odaklı.', [2, 3, 2, 3], 'Net model + neden.', true),
                c('Mesh olanlardan herhangi biri.', [1, 1, 0, 1], 'Belirsiz.'),
                c('Şu raftakilere bakın.', [0, 0, 0, 0], 'Pasif.'),
                c('Renk tercihiniz var mı?', [1, 0, 0, 0], 'Teknik atlandı.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Sürdürülebilirlik ve Yeni Nesil Tekstil',
        description: 'Çevre dostu materyallerden üretilen spor kıyafetleri hakkında teknik detay sunma.',
        difficulty: 'MEDIUM', xpReward: 20,
        customerContext: 'Çevreci müşteri: "Geri dönüşümlü materyaller gerçekten kaliteli mi yoksa pazarlama mı?"',
        steps: [
            step('Sürdürülebilirlik şüphesi.', [
                c('Haklı sorunuz. Geri dönüştürülmüş poliester (rPET) artık birinci kalite ile aynı performansı veriyor. Adidas Primegreen serisi örnek, su tutmaz ve %100 dönüşümlü.', [2, 3, 1, 2], 'Marka örneği + teknik onay.', true),
                c('Aynı, fark yok zaten.', [1, 1, 1, 1], 'Yetersiz.'),
                c('Bizim için reklam, gerçek değil.', [0, 0, 0, 0], 'Markayı kötüledin.'),
                c('Bilmiyorum, etikete bakalım.', [0, 0, 0, 0], 'Yetersiz hazırlık.'),
            ]),
            step('"O zaman sürdürülebilir bir kıyafet önerir misin?"', [
                c('Patagonia ve Adidas Parley serisini önerebilirim — okyanus plastiğinden üretilmiş. Modeli kullanım amacınıza göre seçelim.', [2, 3, 2, 3], 'Spesifik öneri.', true),
                c('Tüm yeni ürünler sürdürülebilir.', [1, 1, 0, 1], 'Yanlış genelleme.'),
                c('Etiketinde yazıyor, kendiniz okuyun.', [0, 0, 0, 0], 'Felaket.'),
                c('Pamuklular tercih edin.', [1, 1, 0, 1], 'Yanlış öneri (spor için).'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Performans Koşu Ayakkabısında Teknoloji Anlatımı',
        description: 'Yüksek fiyatlı bir koşu ayakkabısının teknolojik özelliklerini müşterinin ihtiyacına göre detaylandırma ve değer sunma simülasyonu.',
        difficulty: 'HARD', xpReward: 30,
        customerContext: 'Müşteri: "8500 TL ayakkabı? Ne özelliği var?"',
        steps: [
            step('Fiyat şokunda.', [
                c('Anlaşılır soru. Bu modelde karbon plaka var — enerjinin %4\'ünü geri kazandırır. Ayrıca PEBA köpük, koşu mesafenizi %15 artırabilir. Profesyonel koşucular için.', [2, 3, 1, 2], 'Teknik fayda + somut sayı.', true),
                c('Pahalı çünkü iyi marka.', [0, 1, 0, 0], 'Çok yetersiz.'),
                c('Yenilik için pahalı.', [1, 1, 0, 0], 'Belirsiz.'),
                c('Daha ucuz alternatifimiz var.', [1, 0, 0, 1], 'Hızlı geri çekildin.'),
            ]),
            step('"15K\'da yorulup duruyorum, bu çözüyor mu?"', [
                c('Karbon plaka tam da bunun için. PEBA köpük yorulmayı geciktirir. Ama önce pronasyon analiziniz yapılsın — yanlış destek yorgunluğun ana sebebi olabilir.', [3, 3, 1, 3], 'Çözüm + ekstra hizmet.', true),
                c('Evet, mutlaka çözer.', [1, 1, 0, 2], 'Garantisiz vaat.'),
                c('Antrenmanınıza bağlı.', [0, 1, 0, 0], 'İşe yaramaz cevap.'),
                c('Su tüketiminize bakın.', [0, 0, 0, 0], 'Konu dışı.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Outdoor Şişme Mont Seçimi',
        description: 'Doğa yürüyüşü için yalıtım, ağırlık ve sıkıştırılabilirlik dengesini anlatın.',
        difficulty: 'MEDIUM', xpReward: 20,
        customerContext: 'Müşteri: "Kaz tüyü mü sentetik mi alayım?"',
        steps: [
            step('Yalıtım seçimi.', [
                c('Kuru havalarda kaz tüyü en iyi — sıcaklık/ağırlık oranı süper. Yağmurlu/nemli yerde sentetik daha güvenli, ıslandığında bile ısıtır.', [2, 3, 0, 2], 'Net karşılaştırma.', true),
                c('Kaz tüyü zaten en iyi.', [1, 1, 1, 1], 'Eksik bilgi.'),
                c('Hangisi ucuzsa o.', [0, 0, 0, 0], 'Profesyonel değil.'),
                c('Sentetik popüler.', [1, 1, 0, 1], 'Argüman zayıf.'),
            ]),
            step('"Karadeniz dağlarında 3 günlük tur planlıyorum."', [
                c('Karadeniz rutubetli — sentetik öneririm. Sıkıştırılabilir, sırt çantasında yer kaplamaz. 80g/m² yalıtımlı model uygun olur.', [2, 3, 1, 3], 'Bölge bilgisi + spesifik.', true),
                c('Kaz tüyü 800-fill alın.', [1, 2, 0, 1], 'Bölge uyumsuz öneri.'),
                c('Yağmurluk şart, mont sonra.', [2, 1, 0, 1], 'İyi nokta ama yanıt değil.'),
                c('En pahalısı garanti.', [0, 0, 0, 1], 'Bilgisiz.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Yoga Matı Kalınlık ve Materyal',
        description: 'Farklı yoga türlerine göre uygun mat önerin.',
        difficulty: 'EASY', xpReward: 15,
        customerContext: 'Müşteri yoga yeni başlamış, "İnce mi kalın mı, hangi materyal?"',
        steps: [
            step('Kalınlık sorusu.', [
                c('Başlangıç ve restoratif yoga için 6mm rahat. Vinyasa/güçlü stiller için 4mm daha kararlı. Materyal olarak TPE eko ve kaymaz.', [2, 3, 0, 1], 'İhtiyaca göre seçim.', true),
                c('Hep kalın olsun, rahat olur.', [1, 1, 0, 0], 'Yanlış öneri (dinamik için).'),
                c('Hangisi olursa.', [0, 0, 0, 0], 'Yetersiz.'),
                c('En pahalısı en kaliteli.', [0, 0, 0, 1], 'Argüman zayıf.'),
            ]),
            step('"Hot yoga yapacağım, ne fark eder?"', [
                c('Hot yoga\'da terleme fazla — kaymaz yüzeyli, mikrofiber üstlü mat şart. Yıkanabilir olması da önemli. Bu seri tam uygun.', [2, 3, 1, 3], 'Spesifik bilgi.', true),
                c('Aynı mat olur, sorun yok.', [0, 0, 0, 0], 'Yanlış.'),
                c('Havlu serersiniz, yeter.', [1, 1, 0, 0], 'Profesyonel değil.'),
                c('İndirimde olan bir mat var.', [1, 0, 1, 1], 'İhtiyacı atladın.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Bisiklet Forması ve Aerodinamik',
        description: 'Hobi bisikletçisinden yarış bisikletçisine geçişte ürün önerin.',
        difficulty: 'HARD', xpReward: 30,
        customerContext: 'Müşteri: "Granfondo\'ya hazırlanıyorum, forma da gerekir mi?"',
        steps: [
            step('Forma gereksiz mi?', [
                c('Granfondo gibi mesafelerde aerodinamik forma %3-5 enerji tasarrufu sağlar. Ter geçirimi de önemli — pamuklu felaket olur.', [2, 3, 1, 2], 'Bilimsel fayda.', true),
                c('İsteğe bağlı, gerekmez.', [1, 0, 0, 0], 'Yanlış.'),
                c('Tüm bisikletçilerde olur.', [1, 1, 0, 1], 'Argüman yok.'),
                c('Forma sadece moda.', [0, 0, 0, 0], 'Tam tersi bilgi.'),
            ]),
            step('"Şort önemli mi, normal şort olur mu?"', [
                c('Bisiklet şortunda chamois (yastık) şart — 4 saat üzeri turda olmazsa olmaz. Yaralanma, yara açılması engellenir. Pearl Izumi veya Castelli önereyim.', [3, 3, 2, 3], 'Sağlık + marka önerisi.', true),
                c('Normal şort yeter aslında.', [0, 0, 0, 0], 'Tehlikeli.'),
                c('Ne olur ne olmaz, alın.', [1, 1, 1, 1], 'Sebep yok.'),
                c('En ucuzunu alın deneyin.', [0, 0, 0, 1], 'Yanlış.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Tenis Raketi Ağırlık ve Denge',
        description: 'Orta seviye tenisçiye uygun raket teknik özelliklerini anlatın.',
        difficulty: 'MEDIUM', xpReward: 20,
        customerContext: 'Müşteri: "Aldığım raket çok ağır geliyor, hangi gramaj?"',
        steps: [
            step('Ağırlık sorusu.', [
                c('Orta seviye için 290-300g ideal. Çok hafif raket güç verir ama kontrol kaybı, çok ağır ise yorulma. Denge noktası da önemli — head-light dönüşü hızlandırır.', [2, 3, 1, 2], 'Teknik fark.', true),
                c('Hafif olsun, rahat olur.', [1, 1, 0, 0], 'Eksik bilgi.'),
                c('Tüm raketler benzer.', [0, 0, 0, 0], 'Yanlış.'),
                c('Pro raket alın.', [1, 1, 0, 1], 'Seviyeye uymaz.'),
            ]),
            step('"Stringi ne kadar tension olmalı?"', [
                c('Orta seviye için 23-25 kg. Düşük tension güç, yüksek tension kontrol verir. Kullanıma göre 6 ayda bir değişim öneririm.', [2, 3, 2, 2], 'Kapsamlı.', true),
                c('Standart olsun.', [1, 1, 0, 1], 'Spesifik değil.'),
                c('Bilmiyorum.', [0, 0, 0, 0], 'Yetersiz.'),
                c('Ne kadar sıkı isterseniz.', [1, 0, 0, 0], 'Sebep yok.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Termal İçlik Katmanlama',
        description: 'Kış sporları için katmanlama prensibini anlatın.',
        difficulty: 'EASY', xpReward: 15,
        customerContext: 'Müşteri kayak için ekipman bakıyor, "Üst üste kaç kıyafet?"',
        steps: [
            step('Katman sayısı.', [
                c('3 katman prensibi: 1) Merino veya teknik termal içlik (ter uzaklaştırır), 2) Polar veya yünlü orta katman (izolasyon), 3) Su/rüzgar geçirmez dış katman.', [2, 3, 1, 2], 'Klasik 3-katman.', true),
                c('Ne kadar çok o kadar sıcak.', [0, 1, 0, 0], 'Yanlış mantık.'),
                c('Kalın bir mont yeter.', [1, 0, 0, 0], 'Eksik.'),
                c('Pamuklu içlik en iyi.', [0, 0, 0, 0], 'Yanlış — pamuk ter biriktirir.'),
            ]),
            step('"Merino vs sentetik içlik?"', [
                c('Merino doğal antibakteriyel, kötü koku yapmaz. Pahalı ama 3-4 gün kullanılabilir. Sentetik daha ucuz, hızlı kuruyor ama 1 gün kullanım sınırı.', [2, 3, 1, 2], 'Avantaj-dezavantaj.', true),
                c('Aynı şey, fark etmez.', [0, 0, 0, 0], 'Yanlış.'),
                c('Merino zaten lüks.', [1, 1, 0, 1], 'Bilgi az.'),
                c('Sentetik daha modern.', [1, 1, 0, 1], 'Belirsiz.'),
            ]),
        ],
    });

    out.push({
        category: CAT, title: 'Yüzme Gözlüğü Reçete ve Anti-Fog',
        description: 'Numaralı gözlük takan yüzücüye uygun ekipman önerin.',
        difficulty: 'MEDIUM', xpReward: 20,
        customerContext: 'Müşteri: "Gözlüklüyüm, yüzerken bulanık görüyorum."',
        steps: [
            step('Çözüm arayışı.', [
                c('Reçeteli yüzme gözlüğümüz var — Speedo ve Arena modelleri -1.5 ile -8 arası diyoptri seçenekli. Ölçünüze göre seçebiliriz.', [3, 3, 1, 3], 'Doğrudan çözüm.', true),
                c('Standart gözlük zorlanır.', [1, 1, 0, 0], 'Çözüm yok.'),
                c('Lens takabilirsiniz.', [1, 1, 0, 0], 'Yanlış öneri (havuzda).'),
                c('Yakın görmek için gerek yok.', [0, 0, 0, 0], 'Yanlış.'),
            ]),
            step('"Sürekli buğulanıyor, bu normal mi?"', [
                c('Anti-fog kaplama zamanla aşınır. Anti-fog sprey kullanın veya yenisini alın. Yıkadıktan sonra parmakla içe dokunmamak da önemli — koruyucu tabakayı bozuyor.', [2, 3, 2, 2], 'Bakım + öneri.', true),
                c('Tükürün, sorun çözülür.', [0, 0, 0, 0], 'Profesyonel değil.'),
                c('Markaya bağlı.', [0, 1, 0, 0], 'Yetersiz.'),
                c('Yeni gözlük alın.', [1, 1, 1, 1], 'Eksik bilgi.'),
            ]),
        ],
    });
};
