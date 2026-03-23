import fs from 'fs';
import path from 'path';

async function download() {
    const url = 'https://provinces.open-api.vn/api/?depth=3';
    try {
        console.log("Fetching from:", url);
        const res = await fetch(url);
        const data = await res.json();
        const dir = 'src/data';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        await fs.promises.writeFile(path.join(dir, 'location_data.json'), JSON.stringify(data, null, 2));
        console.log("Downloaded successfully. Items Count:", data.length);
    } catch (err) {
        console.error("Failed download:", err);
    }
}
download();
