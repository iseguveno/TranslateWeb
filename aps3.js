const fs = require("fs");
const path = require("path");
const translate = require("google-translate-api-x");

// JSON içindeki tüm stringleri toplar
function collectStrings(obj, arr) {
  if (typeof obj === "string") {
    arr.push(obj);
  } else if (Array.isArray(obj)) {
    for (const item of obj) collectStrings(item, arr);
  } else if (typeof obj === "object" && obj !== null) {
    for (const key in obj) {
      collectStrings(obj[key], arr);
    }
  }
}

// Çevrilmiş stringleri sırayla geri yerleştirir
function replaceStrings(obj, translatedArr, indexObj) {
  if (typeof obj === "string") {
    return translatedArr[indexObj.i++];
  } else if (Array.isArray(obj)) {
    return obj.map(item => replaceStrings(item, translatedArr, indexObj));
  } else if (typeof obj === "object" && obj !== null) {
    const newObj = {};
    for (const key in obj) {
      newObj[key] = replaceStrings(obj[key], translatedArr, indexObj);
    }
    return newObj;
  }
  return obj;
}

// Diziyi parçalara böler
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Retry ile çeviri yapan yardımcı fonksiyon
async function safeTranslate(texts, toLang, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await translate(texts, { to: toLang });
      return res.map(r => r.text);
    } catch (err) {
      console.error(`⚠️ Çeviri hatası (deneme ${attempt}):`, err.message);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 2000 * attempt)); // bekle, sonra tekrar dene
      } else {
        throw err;
      }
    }
  }
}

async function translateFile(filePath, outDir, toLang) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    const jsonData = JSON.parse(data);

    // 1. Tüm stringleri topla
    const strings = [];
    collectStrings(jsonData, strings);

    console.log(`🔤 ${filePath} dosyasında çevrilecek metin sayısı: ${strings.length}`);

    if (strings.length === 0) {
      console.log(`⚠️ ${filePath} dosyasında çevirilecek string yok.`);
      return;
    }

    // 2. Batch çeviri (100 stringlik parçalar halinde)
    const chunks = chunkArray(strings, 100);
    let translatedArr = [];

    for (const [i, ch] of chunks.entries()) {
      console.log(`⏳ ${filePath} için batch ${i + 1}/${chunks.length} çevriliyor...`);
      const res = await safeTranslate(ch, toLang);
      translatedArr = translatedArr.concat(res);
      await new Promise(r => setTimeout(r, 1000)); // her batch arasında 1 sn bekle
    }

    // 3. Çevirileri geri yerleştir
    const translatedJson = replaceStrings(jsonData, translatedArr, { i: 0 });

    // 4. Kaydet
    const baseName = path.basename(filePath);
    const outputFile = path.join(outDir, baseName);

    fs.writeFileSync(outputFile, JSON.stringify(translatedJson, null, 2), "utf8");
    console.log(`✅ ${filePath} -> ${outputFile}`);
  } catch (err) {
    console.error(`❌ Hata [${filePath}]:`, err.message);
  }
}

async function main() {
  // Kullanım: node app.js <kaynakKlasör> <hedefKlasör> <dilKodu>
  const folder = process.argv[2] || "./json";
  const outDir = process.argv[3] || "./tr";
  const toLang = process.argv[4] || "tr";

  console.log(`🌍 Kaynak klasör: ${folder}`);
  console.log(`📂 Çıktı klasörü: ${outDir}`);
  console.log(`🌍 Hedef dil: ${toLang}`);

  // Çıktı klasörünü oluştur
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
    console.log(`📂 Klasör oluşturuldu: ${outDir}`);
  }

  const files = fs.readdirSync(folder).filter(f => f.endsWith(".json"));

  if (files.length === 0) {
    console.log("⚠️ Kaynak klasörde hiç .json dosyası bulunamadı.");
    return;
  }

  for (const file of files) {
    const filePath = path.join(folder, file);
    await translateFile(filePath, outDir, toLang);
  }

  console.log("🎉 Tüm dosyalar çevrildi!");
}

main();
 //             ./en koynak klasor ./tr kaydedilcek klasor tr donusturulacak dil
//node aps3.js ./en ./tr tr ./en altındaki .json dosylarını ./tr altına tr diline cevirir