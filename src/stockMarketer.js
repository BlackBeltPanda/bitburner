var totalprofit = 0;
var startTime = new Date(new Date().getTime()).toLocaleTimeString();
const c = { ounter: 0 };

/** @param {import(".").NS } ns */
function tendStocks(ns) {
    const allStocks = getAllStocks(ns);

    // select stocks with <51% chance to increase price
    const stocksToSell = getBearStocks(allStocks, 0.51);
    // sell all those stocks
    sellStocks(ns, stocksToSell);

    // select stocks with >55% chance to increase price
    const stocksToBuy = getBullStocks(allStocks, 0.55);
    // buy the highest-rated stocks available
    buyStocks(ns, stocksToBuy);

    // keep a log of net worth change over time
    const portfolioValue = getPortfolioValue(allStocks);
    const cashValue = ns.getPlayer().money;
    const totalValue = portfolioValue + cashValue;
    c.ounter += 1
    if (c.ounter == 9 && delay > 30) {
        ns.tprint(`Net worth: ${ns.nFormat(totalValue, "$0.000a")} = ${ns.nFormat(portfolioValue, "$0.0a")} stocks + ${ns.nFormat(cashValue, "$0.0a")} cash`);
    } else if (c.ounter == 10) {
        c.ounter = 0
    }
}

/** @param {import(".").NS } ns */
function getAllStocks(ns) {
    // make a lookup table of all stocks and all their properties
    const stockSymbols = ns.stock.getSymbols();
    const stocks = {};
    for (const symbol of stockSymbols) {

        const pos = ns.stock.getPosition(symbol);
        const stock = {
            symbol: symbol,
            forecast: ns.stock.getForecast(symbol),
            volatility: ns.stock.getVolatility(symbol),
            askPrice: ns.stock.getAskPrice(symbol),
            bidPrice: ns.stock.getBidPrice(symbol),
            maxShares: ns.stock.getMaxShares(symbol),
            shares: pos[0],
            sharesAvgPrice: pos[1],
            sharesShort: pos[2],
            sharesAvgPriceShort: pos[3]
        };
        stock.summary = `${stock.symbol}: ${stock.forecast.toFixed(3)} ± ${stock.volatility.toFixed(3)}`;
        stocks[symbol] = stock;
    }
    return stocks;
}

function getPortfolioValue(stocks) {
    let value = 0;
    for (const stock of Object.values(stocks)) {
        value += stock.bidPrice * stock.shares - stock.askPrice * stock.sharesShort;
    }
    return value;
}

function getBullStocks(stocks, threshold = 0.55) {
    // select stocks with at least threshold % chance to increase each cycle
    const bullStocks = [];
    for (const stock of Object.values(stocks)) {
        if (stock.forecast - stock.volatility > threshold) {
            bullStocks.push(stock);
        }
    }
    return bullStocks;
}

function getBearStocks(stocks, threshold = 0.48) {
    // select stocks with at most threshold % chance to increase each cycle
    const bearStocks = [];
    for (const stock of Object.values(stocks)) {
        if (stock.forecast - stock.volatility < threshold) {
            bearStocks.push(stock);
        }
    }
    return bearStocks;
}

/** @param {import(".").NS } ns */
function sellStocks(ns, stocksToSell) {
    for (const stock of stocksToSell) {
        if (stock.shares > 0) {
            const salePrice = ns.stock.sell(stock.symbol, stock.shares);
            if (salePrice != 0) {
                const saleTotal = salePrice * stock.shares;
                const saleCost = stock.sharesAvgPrice * stock.shares;
                const saleProfit = saleTotal - saleCost;
                stock.shares = 0;
                ns.tprint(`Sold ${stock.summary} stock for ${ns.nFormat(saleProfit, "$0.0a")} profit`);
                totalprofit += saleProfit;
                ns.tprint(`Total Stock Profits Since ${startTime}: ${ns.nFormat(totalprofit, "$0.0a")}`);
            }
        }
    }
}

/** @param {import(".").NS } ns */
function buyStocks(ns, stocksToBuy) {
    // buy stocks, spending more money on higher rated stocks
    const bestStocks = stocksToBuy.sort((a, b) => {
        return b.forecast - a.forecast; // descending
    });

    let transactions = 0;
    if (ns.args[0]) { var maxTransactions = ns.args[0]; } else { var maxTransactions = 4; };
    if (ns.args[1]) { var savings = ns.args[1]; } else { var savings = 5000000 };
    for (const stock of bestStocks) {
        const moneyRemaining = ns.getPlayer().money;
        // don't spend the last 5 million bux
        if (moneyRemaining < savings || transactions >= maxTransactions) {
            return;
        }
        // spend up to half the money available on the highest rated stock
        // (the following stock will buy half as much)
        const moneyThisStock = moneyRemaining / 2 - 100000;
        let numShares = moneyThisStock / stock.askPrice;

        numShares = Math.min(numShares, stock.maxShares - stock.shares - stock.sharesShort);
        const boughtPrice = ns.stock.buy(stock.symbol, numShares);
        if (boughtPrice != 0) {
            const boughtTotal = boughtPrice * numShares;
            transactions += 1;
            stock.shares += numShares;
            ns.tprint(`Bought ${ns.nFormat(boughtTotal, "$0.0a")} of ${stock.summary}`);
        }
    }
}

/** @param {import(".").NS } ns */
export async function main(ns) {
    if (ns.args[2]) { var delay = ns.args[2]; } else { var delay = 60; };//delay in seconds
    var delay = delay * 1000;//change to ms
    ns.disableLog("sleep");
    ns.disableLog("stock.buy");
    ns.disableLog("stock.sell");
    while (true) {
        tendStocks(ns);
        await ns.sleep(delay);
    }
}

// vim: set ft=javascript :