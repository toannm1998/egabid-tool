// const domain = "http://172.16.2.66:3000";

//prod
const domain = "https://gateway.egabid.com";

const getAuction = async (auctionId) => {
  const resp = await fetch(domain + `/api/v2/auction/${auctionId}`);
  const auction = await resp.json();
  const startAt = new Date(auction.data.startAt);
  const endAt = new Date(auction.data.endAt);
  return {
    step: auction.data.stepPrice,
    start: auction.data.startPrice,
    status: auction.data.status,
    startAt: startAt.getTime(),
    endAt: endAt.getTime(),
    countdown: 30,
    bids: [],
    botBids: [],
    endTime: auction.data.endAt,
  };
};

const bidAuction = async (auctionId, bidPrice, token) => {
  const data = {
    bidPrice: bidPrice,
    auctionId: auctionId,
    requestTime: new Date().toISOString(),
    requestId: generateRandomString(20),
  };
  fetch(domain + "/api/v2/auction/bid", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok", bidPrice);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Success:", data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
};

const getCookie = async (page) => {
  const cookies = await page.cookies();
  const actCookie = cookies.find((cookie) => cookie.name === "_act");
  if (actCookie) {
    // console.log('Cookie _act:', actCookie);
    return actCookie;
  } else {
    console.log("Cookie _act không tồn tại");
  }
};

const generateRandomString = (length) => {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const bidAll = (auctionId, bidPrice, token) => {
  const fetchPromises = bidPrice.map((price) => {
    const data = {
      bidPrice: price,
      auctionId: auctionId,
      requestTime: new Date().toISOString(),
      requestId: generateRandomString(20),
    };
    fetch(domain + "/api/v2/auction/bid", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  });
  const results = Promise.allSettled(fetchPromises);
};

module.exports = {
  getCookie,
  getAuction,
  bidAuction,
  bidAll,
};
