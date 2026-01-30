// filepath: functions/api/save.js
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    let { content, message, password, path } = body;

    // --- 1. CONFIGURATION (From Cloudflare Settings) ---
    const TARGET_REPO = env.REPO_NAME; 
    const REAL_PASSWORD = env.ADMIN_PASSWORD;

    if (!TARGET_REPO || !REAL_PASSWORD) {
        return new Response(JSON.stringify({ error: "Server Config Error: Missing Env Vars (REPO_NAME or ADMIN_PASSWORD)" }), { status: 500 });
    }

    // --- 2. SECURITY CHECK ---
    if (password !== REAL_PASSWORD) {
       return new Response(JSON.stringify({ error: "❌ Invalid Password" }), { status: 401 });
    }

    // --- 3. TARGETING ---
    // If saving image, keep path. If menu, force update local data file.
    const targetPath = path.startsWith("images/") ? path : `data/menu.json`;
    
    // GitHub Config
    const REPO_OWNER = "arbyrudra"; 
    const BRANCH = "main";
    const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${TARGET_REPO}/contents/${targetPath}`;
    
    const HEADERS = {
      'Authorization': `token ${env.GITHUB_TOKEN}`,
      'User-Agent': 'Cloudflare-Pages-Function',
      'Content-Type': 'application/json',
    };

    // --- 4. AUTO-VERSIONING (Prevents "File Conflict" Errors) ---
    let currentSha = null;
    try {
        const getReq = await fetch(API_URL, { method: 'GET', headers: HEADERS });
        if (getReq.ok) {
            const fileData = await getReq.json();
            currentSha = fileData.sha;
        }
    } catch (e) {}

    // --- 5. EXECUTE SAVE ---
    const githubResponse = await fetch(API_URL, {
      method: 'PUT',
      headers: HEADERS,
      body: JSON.stringify({
        message: message,
        content: content,
        branch: BRANCH,
        sha: currentSha 
      })
    });

    const data = await githubResponse.json();
    if (!githubResponse.ok) return new Response(JSON.stringify({ error: data.message }), { status: 500 });

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}