const fs = require('fs');

async function generate() {
  const outDir = 'public/cappuccino';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  
  // Write a simple placeholder webp file (just a 1x1 transparent webp base64 decoded)
  const webpBase64 = "UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";
  const buffer = Buffer.from(webpBase64, 'base64');
  
  for(let i=1; i<=298; i++) {
    fs.writeFileSync(`${outDir}/frame_${i.toString().padStart(4, '0')}.webp`, buffer);
  }
  console.log('Frames generated');
}

generate();
