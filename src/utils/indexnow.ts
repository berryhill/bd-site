import { SITE } from "@/config";

// IndexNow API key - must match the key in public/{key}.txt
const INDEXNOW_KEY = "a63643bb50ffbee1ac79fcfe60003c1dc912bdee3803a9308fa313f06024d2c6";

// Submit one URL to IndexNow (notifies Bing, Yandex, Naver, Seznam, Yep)
export async function submitToIndexNow(url: string): Promise<boolean> {
  try {
    const indexNowUrl = `https://www.bing.com/indexnow`;

    const response = await fetch(indexNowUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        host: new URL(SITE.website).hostname,
        key: INDEXNOW_KEY,
        urlList: [url],
      }),
    });

    if (response.ok || response.status === 202) {
      console.log(`✅ IndexNow: Successfully submitted ${url}`);
      return true;
    } else {
      console.error(`❌ IndexNow failed: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error("❌ IndexNow error:", error);
    return false;
  }
}

// Submit multiple URLs in bulk (max 10,000 per submission)
export async function submitBulkToIndexNow(urls: string[]): Promise<boolean> {
  if (urls.length === 0) return false;
  if (urls.length > 10000) {
    console.warn("⚠️ IndexNow: Cannot submit more than 10,000 URLs at once");
    urls = urls.slice(0, 10000);
  }

  try {
    const indexNowUrl = `https://www.bing.com/indexnow`;

    const response = await fetch(indexNowUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        host: new URL(SITE.website).hostname,
        key: INDEXNOW_KEY,
        urlList: urls,
      }),
    });

    if (response.ok || response.status === 202) {
      console.log(`✅ IndexNow: Successfully submitted ${urls.length} URLs`);
      return true;
    } else {
      console.error(`❌ IndexNow bulk failed: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error("❌ IndexNow bulk error:", error);
    return false;
  }
}
