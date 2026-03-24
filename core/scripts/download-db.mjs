import fs from "fs";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// BURAYA BULUT LINKINI YAZACAGIZ
const DB_URL = process.env.DB_URL || "https://github.com/selimdilsadercan/mini-google/releases/download/v0.0.0/crawler.db";
const TARGET_PATH = path.resolve(__dirname, "../crawler.db");

async function downloadWithRedirect(url, targetPath) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        // Redirect kontrolü (301 veya 302)
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          console.log(`↪️ Yönlendiriliyor: ${response.headers.location}`);
          return downloadWithRedirect(response.headers.location, targetPath)
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200) {
          return reject(
            new Error(
              `❌ İndirme başarısız! Status Code: ${response.statusCode}`,
            ),
          );
        }

        const file = fs.createWriteStream(targetPath);
        response.pipe(file);

        file.on("finish", () => {
          file.close();
          console.log("✅ Veritabanı başarıyla indirildi ve sisteme kuruldu!");
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlink(targetPath, () => {});
        reject(err);
      });
  });
}

async function main() {
  if (DB_URL === "YOUR_CLOUDFLARE_DIRECT_LINK_HERE") {
    console.error(
      "❌ Hata: DB_URL ayarlanmamış! Lütfen scripts/download-db.mjs dosyasındaki linki güncelleyin.",
    );
    process.exit(1);
  }

  console.log("⏳ Veritabanı indiriliyor...");
  console.log(`🔗 Kaynak: ${DB_URL}`);

  try {
    await downloadWithRedirect(DB_URL, TARGET_PATH);
  } catch (err) {
    console.error(`❌ Hata oluştu: ${err.message}`);
    process.exit(1);
  }
}

main();
