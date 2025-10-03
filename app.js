const fs = require("fs");
const path = require("path");
const translate = require("google-translate-api-x"); // stabil fork

// Recursive çeviri fonksiyonu
async function translateObject(obj, toLang) {
  if (typeof obj === "string") {
    try {
      const res = await translate(obj, { to: toLang });
      return res.text;
    } catch (e) {
      console.error("Çeviri hatası:", obj, e.message);
      return obj; // hata olursa orijinal değer
    }
  } else if (Array.isArray(obj)) {
    const translatedArray = [];
    for (const item of obj) {
      translatedArray.push(await translateObject(item, toLang));
    }
    return translatedArray;
  } else if (typeof obj === "object" && obj !== null) {
    const translatedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        translatedObj[key] = await translateObject(obj[key], toLang);
      }
    }
    return translatedObj;
  } else {
    return obj;
  }
}

async function translateFile(filePath, outDir, toLang) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    const jsonData = JSON.parse(data);

    const translatedJson = await translateObject(jsonData, toLang);

    const baseName = path.basename(filePath); // orijinal dosya adı
    const outputFile = path.join(outDir, baseName);

    fs.writeFileSync(outputFile, JSON.stringify(translatedJson, null, 2), "utf8");
    console.log(`✅ ${filePath} -> ${outputFile}`);
  } catch (err) {
    console.error(`Hata [${filePath}]:`, err.message);
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
    console.log(`📂 Klasör oluşturuldu: ${outDir}`);
  }

  const files = fs.readdirSync(folder).filter(f => f.endsWith(".json"));

  if (files.length === 0) {
    console.log("⚠️ Klasörde hiç .json dosyası bulunamadı.");
    return;
  }

  for (const file of files) {
    const filePath = path.join(folder, file);
    await translateFile(filePath, outDir, toLang);
  }

  console.log("🎉 Tüm dosyalar çevrildi!");
}

main();
