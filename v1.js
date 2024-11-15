const connectWs = require("./ws.js");
const loginToPage = require("./account.js");
const cal = require("./cal.js");
const egabid = require("./egabid.js");
const NumberQueue = require("./queue.js");
const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const { parse } = require("json2csv");
const path = require("path");

const regex =
  /^https:\/\/egabid\.com\/en\/auction\/([a-zA-Z0-9-']+)-(\d+)\.html$/;

// Add an array of account credentials
const accounts = [
  { username: "fenedi9796@gyxmz.com", password: "12345678" },
  { username: "toannguyenminh.dev@gmail.com", password: "@Dmin4123" },
  { username: "toan@chapsmail.com", password: "123456" },
  { username: "bachxtnd2000@gmail.com", password: "123321" },
  { username: "testmetatech@gmail.com", password: "12345678" },
  { username: "toannguyen100998@gmail.com", password: "@Dmin4123" },
];

// Global variable to store all bid history
let globalBidHistory = [];

let jsonFilename;
let bidHistory = [];
let userBids = new Map(); // To keep track of bids placed by each user

// Add at the top with other constants
const TARGET_AUCTION_URL = "https://egabid.com/en/auction/22477.html";
const BID_INTERVAL = 1000; // Time in milliseconds between bids

(async () => {
  // Connect ws
  const client = connectWs();

  // Launch browsers
  const browserInstances = await Promise.all(
    accounts.map(async (account, index) => {
      try {
        const browser = await puppeteer.launch({
          headless: false,
          defaultViewport: null,
          args: [`--window-position=${index * 100},${index * 100}`],
        });
        const page = await browser.newPage();

        // Login and get token
        await loginToPage(page, account);

        // Add redirect after login with retry logic

        let token = null;
        let running = true;

        const getToken = async () => {
          if (!token && running) {
            try {
              const cookie = await egabid.getCookie(page);
              if (cookie) {
                token = cookie.value;
                let retries = 3;
                while (retries > 0) {
                  try {
                    await page.goto(TARGET_AUCTION_URL, {
                      waitUntil: "networkidle2",
                      timeout: 30000,
                    });
                    break;
                  } catch (error) {
                    console.log(
                      `Navigation failed for account ${
                        index + 1
                      }, retries left: ${retries - 1}`
                    );
                    retries--;
                    if (retries === 0) {
                      throw error;
                    }
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                  }
                }

                console.log(`Token obtained for account ${index + 1}`);
              }
            } catch (error) {
              if (error.message.includes("Session closed")) {
                console.log(
                  `Browser for account ${index + 1} has been closed.`
                );
                running = false;
              } else {
                console.error(
                  `Error getting token for account ${index + 1}:`,
                  error
                );
              }
            }
          }
        };

        // Try to get token every 3 seconds
        const tokenInterval = setInterval(getToken, 3000);

        let bot;
        page.on("framenavigated", async (frame) => {
          const match = frame.url().match(regex);
          if (match) {
            const auctionId = match[2];
            if (token) {
              bot = await autoBid(
                auctionId,
                client,
                token,
                index,
                account.username
              );
              console.log(`Account ${index + 1} joined auction`, auctionId);
            } else {
              console.log(
                `Account ${index + 1} waiting for token to join auction`,
                auctionId
              );
            }
          } else {
            if (bot) {
              bot();
              bot = null;
            }
          }
        });

        return { browser, page, token, tokenInterval, running };
      } catch (error) {
        console.error(
          `Error initializing browser for account ${index + 1}:`,
          error
        );
        return null;
      }
    })
  );

  // Filter out null values (failed browser initializations)
  const activeBrowsers = browserInstances.filter(
    (instance) => instance !== null
  );

  // Wait for all auctions to end
  await Promise.all(
    activeBrowsers.map(
      (instance) =>
        new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (!instance.running) {
              clearInterval(instance.tokenInterval);
              clearInterval(checkInterval);
              resolve();
            }
          }, 1000);
        })
    )
  );

  // Export bid history after all auctions have ended

  if (globalBidHistory.length > 0) {
    await exportBidHistory(globalBidHistory[0].auctionId);
  }

  // Close all browsers
  await Promise.all(
    activeBrowsers.map(async (instance) => {
      if (instance.browser) {
        await instance.browser.close();
      }
    })
  );

  console.log("All auctions have ended and browsers have been closed.");
})();

const autoBid = async (auctionId, client, token, accountIndex, username) => {
  let running = true;
  const topicAuction = `egabid-auction/bid/${auctionId}`;
  const data = await egabid.getAuction(auctionId);

  const myQueue = new NumberQueue();

  if (client) {
    client.subscribe(topicAuction, function (err) {
      if (!err) {
        console.log(
          `Account ${
            accountIndex + 1
          } subscribed to topics: egabid-auction/bid/${auctionId}`
        );
      }
    });
    client.on("message", function (topic, message) {
      let msg = JSON.parse(message.toString());
      if (topic === topicAuction) {
        cal.addNumber(data.bids, msg.bidPrice);
      }
      if (
        topic === "egabid-auction/status" &&
        msg.id == auctionId &&
        msg.countdown
      ) {
        data.countdown = msg.countdown;
      }
    });
  }

  const stopBot = () => {
    running = false;
    if (client) {
      client.unsubscribe(topicAuction, (err) => {
        if (!err) {
          console.log(
            `Account ${accountIndex + 1} unsubscribed from topic: `,
            topicAuction
          );
        }
      });
    }
    console.log(`Bot for account ${accountIndex + 1} stopped.`);
  };

  const intervalId = setInterval(() => {
    if (running) {
      const minNotInList = cal.findMinNotInList(
        data.bids,
        data.step,
        data.start
      );
      const numbersWithCountOne = cal.findNumbersWithCountOneAndLessThanMin(
        data.bids,
        minNotInList
      );
      const list = [];
      numbersWithCountOne.forEach((element) => {
        if (!data.botBids.includes(element.number)) {
          data.botBids.push(element.number);
          list.push(element.number);
        }
      });
      if (!data.botBids.includes(minNotInList)) {
        data.botBids.push(minNotInList);
        list.push(minNotInList);
      }
      if (list.length > 0) {
        myQueue.enqueue(list);
      }
    } else {
      clearInterval(intervalId);
      console.log(`Account ${accountIndex + 1} all bids:`, data.bids);
    }
  }, 100);

  jsonFilename = path.join(__dirname, `auction_${auctionId}_bid_history.json`);

  // Initialize the JSON file with an empty array
  await fs.writeFile(jsonFilename, "[]");

  const intervalBid = setInterval(async () => {
    if (running) {
      const now = Date.now();
      if (now >= data.startAt && now <= data.endAt) {
        // Initialize user's bid set if not exists
        if (!userBids.has(username)) {
          userBids.set(username, new Set());
        }
        const userBidSet = userBids.get(username);

        // Calculate next bid price
        let nextPrice;
        if (userBidSet.size === 0) {
          nextPrice = data.start; // Start from minimum price
        } else {
          const lastBid = Math.max(...Array.from(userBidSet), 0);
          nextPrice = lastBid + data.step; // Increment by step price
        }

        // Check if user hasn't bid this price before
        if (!userBidSet.has(nextPrice)) {
          console.log(`Account ${accountIndex + 1} bidding:`, nextPrice);
          const bidTime = new Date().toISOString();
          egabid.bidAll(auctionId, [nextPrice], token);

          const bidInfo = {
            username,
            bidPrice: nextPrice,
            time: bidTime,
            auctionId,
          };
          bidHistory.push(bidInfo);
          userBidSet.add(nextPrice);

          if (bidHistory.length % 10 === 0) {
            await saveBidHistoryToFile();
          }
        } else {
          console.log(
            `Account ${
              accountIndex + 1
            } skipped bidding: price ${nextPrice} already bid by this user`
          );
        }
      } else if (now > data.endAt) {
        clearInterval(intervalBid);
        console.log(`Auction ended for Account ${accountIndex + 1}`);
        running = false;
        await saveBidHistoryToFile();
        await createCsvFromJson(auctionId);
      }
    } else {
      clearInterval(intervalBid);
    }
  }, BID_INTERVAL); // Bid every second

  return stopBot;
};

// Function to save bid history to JSON file
async function saveBidHistoryToFile() {
  try {
    await fs.writeFile(jsonFilename, JSON.stringify(bidHistory, null, 2));
    console.log("Bid history saved to file");
  } catch (error) {
    console.error("Error saving bid history to file:", error);
  }
}

// Function to create CSV file from JSON data when auction ends
async function createCsvFromJson(auctionId) {
  try {
    const csvFilename = path.join(
      __dirname,
      `auction_${auctionId}_bid_history.csv`
    );
    const csv = parse(bidHistory, {
      fields: ["username", "bidPrice", "time", "auctionId"],
    });
    await fs.writeFile(csvFilename, csv);
    console.log(`CSV file created: ${csvFilename}`);
  } catch (error) {
    console.error("Error creating CSV file:", error);
  }
}
