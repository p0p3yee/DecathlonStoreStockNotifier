require("dotenv").config();
const { bottoken, modelid, skuid, ownerid, checkInMins } = process.env;
const { Telegraf } = require("telegraf");
const r = require("request-promise");

const STORE_ID = {
  TKO: "0070235002350",
  CWB: "0070161401614",
  MK: "0070161801618",
};

const bot = new Telegraf(bottoken);

const getStockInfo = (storeids, skuid, modelid) =>
  r({
    url: `https://www.decathlon.com.hk/zh/ajax/rest/model/com/decathlon/cube/commerce/inventory/InventoryActor/getStoreAvailability?storeIds=${storeids.join(
      ","
    )}&skuId=${skuid}&modelId=${modelid}&displayStoreDetails=false`,
    method: "GET",
    json: true,
  });

const parseResult = (r) =>
  r.responseTO &&
  r.responseTO.data &&
  r.responseTO.data.length > 0 &&
  r.responseTO.data.map((v) => {
    return {
      storeId: v.storeId,
      storeName: v.storeName,
      skuId: v.skuId,
      availabilityInfo: v.availabilityInfo,
      quantity: v.quantity,
    };
  });

setInterval(async () => {
  console.log("Checking Stock...");
  const r = parseResult(await getStockInfo([STORE_ID.MK], skuid, modelid));
  if (!r) return;
  if (r[0].quantity > 0) {
    bot.telegram.sendMessage(
      ownerid,
      `${r[0].storeName}: <b>${r[0].quantity} left</b>`
    );
  }
}, parseInt(checkInMins) * 60 * 1000);

bot.use((ctx, next) => {
  if (ctx.from.id == ownerid && ctx.message && ctx.message.text) {
    next();
  } else {
    console.log(ctx.from.id);
  }
});

bot.command("status", async (ctx) => {
  const r = parseResult(
    await getStockInfo(
      [STORE_ID.MK, STORE_ID.CWB, STORE_ID.TKO],
      skuid,
      modelid
    )
  );
  if (!r) {
    ctx.replyWithHTML("Unable to get data now.\nTry again later.", {
      reply_to_message_id: ctx.message.message_id,
    });
    return;
  }
  let txt = "";
  r.forEach((v) => {
    txt += `${v.storeName}: <b>${
      v.availabilityInfo == "inStock" ? v.quantity + " left" : "No Stock"
    }</b>\n`;
  });
  ctx.replyWithHTML(txt, { reply_to_message_id: ctx.message.message_id });
});

bot.launch();
