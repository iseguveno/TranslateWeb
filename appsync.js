const fs = require("fs");
const path = require("path");
const translate = require("google-translate-api-x"); // stabil fork

// JSON içindeki tüm stringleri toplar
function collectStrings(obj, arr) {
  if (typeof obj === "string") {
    arr.push(obj.trim()); // boşlukları temizle
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

    // 2. Batch çeviri yap
    const results = await translate(strings, { to: toLang });
    const translatedArr = results.map(r => r.text);

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
  // Kullanım: node app.js <kaynakKlasör> <dilKodu>
  const folder = process.argv[2] || "./json";
  const toLang = process.argv[3] || "tr";

  console.log(`🌍 Kaynak klasör: ${folder}`);
  console.log(`🌍 Hedef dil: ${toLang}`);

  // Çıktı klasörü proje kökünde ./<dilKodu> olacak
  const outDir = path.join("./", toLang);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
    console.log(`📂 Çıktı klasörü oluşturuldu: ${outDir}`);
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
