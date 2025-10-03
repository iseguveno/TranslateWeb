const fs = require("fs");
const path = require("path");

// JSON dosyasında duplicate keyleri regex ile yakalar
function findDuplicateKeys(content) {
  const keyRegex = /"([^"]+)":/g;
  const keyCounts = {};
  let match;
  while ((match = keyRegex.exec(content)) !== null) {
    keyCounts[match[1]] = (keyCounts[match[1]] || 0) + 1;
  }
  return Object.entries(keyCounts).filter(([k, v]) => v > 1);
}

function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const duplicates = findDuplicateKeys(content);

    if (duplicates.length > 0) {
      console.log(`⚠️ ${filePath} dosyasında duplicate key(ler) bulundu:`);
      duplicates.forEach(([key, count]) => {
        console.log(`   - "${key}" ${count} kez tanımlanmış`);
      });
    } else {
      console.log(`✅ ${filePath}: duplicate key bulunamadı`);
    }
  } catch (err) {
    console.error(`❌ Hata [${filePath}]: ${err.message}`);
  }
}

function main() {
  const folder = process.argv[2];
  if (!folder) {
    console.error("❌ Kullanım: node checkDuplicates.js <klasörYolu>");
    process.exit(1);
  }

  if (!fs.existsSync(folder)) {
    console.error("❌ Belirtilen klasör bulunamadı:", folder);
    process.exit(1);
  }

  const files = fs.readdirSync(folder).filter(f => f.endsWith(".json"));

  if (files.length === 0) {
    console.log("⚠️ Klasörde hiç .json dosyası yok:", folder);
    return;
  }

  console.log(`🔎 ${folder} klasöründeki ${files.length} JSON dosyası kontrol ediliyor...\n`);
  for (const file of files) {
    const filePath = path.join(folder, file);
    checkFile(filePath);
  }
}

main();

//node checkDuplicates.js ./en
