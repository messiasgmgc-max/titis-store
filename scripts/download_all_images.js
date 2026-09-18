const https = require('https');
const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, '../web/public/produtos');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const products = require('../supabase/wp_products_full.json');
const allImages = new Set();
products.forEach((p) => {
  if (p.images) {
    p.images.forEach((img) => {
      if (img.src) allImages.add(img.src);
    });
  }
});

console.log(`Iniciando download de ${allImages.size} imagens para ${targetDir}...`);

function downloadImage(url) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const filename = path.basename(parsedUrl.pathname);
      const destPath = path.join(targetDir, filename);

      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
        return resolve({ url, filename, status: 'exists' });
      }

      const options = {
        hostname: '187.33.241.58',
        port: 443,
        path: parsedUrl.pathname,
        method: 'GET',
        headers: { Host: 'titisstore.com.br', 'User-Agent': 'curl/8.21.0' },
        rejectUnauthorized: false,
        timeout: 10000,
      };

      const fileStream = fs.createWriteStream(destPath);
      const req = https.request(options, (res) => {
        if (res.statusCode !== 200) {
          fileStream.close();
          try { fs.unlinkSync(destPath); } catch {}
          return resolve({ url, filename, status: `error ${res.statusCode}` });
        }
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve({ url, filename, status: 'downloaded' });
        });
      });

      req.on('error', (err) => {
        try { fileStream.close(); fs.unlinkSync(destPath); } catch {}
        resolve({ url, filename, status: `error: ${err.message}` });
      });

      req.on('timeout', () => {
        req.destroy();
        try { fileStream.close(); fs.unlinkSync(destPath); } catch {}
        resolve({ url, filename, status: 'timeout' });
      });

      req.end();
    } catch (err) {
      resolve({ url, status: `exception: ${err.message}` });
    }
  });
}

async function run() {
  const urls = Array.from(allImages);
  const concurrency = 6;
  let index = 0;
  let successCount = 0;
  let failCount = 0;

  async function worker() {
    while (index < urls.length) {
      const currentIndex = index++;
      const url = urls[currentIndex];
      const res = await downloadImage(url);
      if (res.status === 'downloaded' || res.status === 'exists') {
        successCount++;
        process.stdout.write(`[${successCount + failCount}/${urls.length}] OK: ${res.filename} (${res.status})\n`);
      } else {
        failCount++;
        process.stdout.write(`[${successCount + failCount}/${urls.length}] FAIL: ${url} -> ${res.status}\n`);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  console.log(`\nFinalizado! Sucesso: ${successCount}, Falhas: ${failCount}`);
}

run();
