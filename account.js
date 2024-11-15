



const loginToPage = async (page, credentials) => {
    // const loginUrl = "https://myaccount-beta.hyratek.com/login?service=DEVEGABID&redirect_url=https%3A%2F%2Fdev.egabid.com%2F&continue=https%3A%2F%2Fdev.egabid.com%2Fvi&ref="; 
    //prod
    const loginUrl = "https://hyralogin.com/login?service=EGABID-WEB-PROD-VOnya4UdxGHh3EjyiuTr&redirect_url=https%3A%2F%2Fegabid.com%2F&continue=https%3A%2F%2Fegabid.com%2Fvi&ref=";
    
    let retries = 3;
    while (retries > 0) {
        try {
            await page.goto(loginUrl, { 
                waitUntil: 'networkidle2',
                timeout: 60000
            });
            break; // Nếu thành công, thoát khỏi vòng lặp
        } catch (error) {
            console.log(`Navigation failed, retrying... (${retries} attempts left)`);
            retries--;
            if (retries === 0) throw error; // Ném lỗi nếu hết số lần thử
        }
    }

    await page.type('input[name="email_or_phone"]', credentials.username);
    await page.type('input[name="password"]', credentials.password);
    await page.click('button[type="submit"]');
};

module.exports = loginToPage;
