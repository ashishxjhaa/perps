
type OrderEntry = {
    price: number
    qty: number
    userId: string
    orderId: string
}

type OrderBook = {
    [asset: string]: {
        bids: OrderEntry[]
        asks: OrderEntry[]
    }
}

let ORDERBOOK: OrderBook = {}

type AssetMap = {
    [asset: string]: number
}

type BalanceSheet = {
    available: { [userId: string]: AssetMap }
    locked: { [userId: string]: AssetMap }
}

let BALANCES: BalanceSheet = {
    available: {},
    locked: {}
}

export function ensureAsset(asset: string): void {
    if (!ORDERBOOK[asset]) {
        ORDERBOOK[asset] = { bids: [], asks: [] }
    }
}

export function addOrderToBook(asset: string, side: 'buy' | 'sell', price: number, qty: number, userId: string, orderId: string): void {
    ensureAsset(asset)

    const order: OrderEntry = { price, qty, userId, orderId }

    if (side === 'buy') {
        ORDERBOOK[asset]?.bids.push( order )
    } else {
        ORDERBOOK[asset]?.asks.push( order )
    }
    
}

export function sortOrderBook(asset: string): void {
    ORDERBOOK[asset]?.bids.sort((a, b) => b.price - a.price)
    ORDERBOOK[asset]?.asks.sort((a, b) => a.price - b.price)
}

export function matchOrders(asset: string): number {
    let totalFilled = 0

    while (true) {
        const bestBid = ORDERBOOK[asset]?.bids[0]
        const bestAsk = ORDERBOOK[asset]?.asks[0]

        // stop the loop if no match is possible
        if (!bestBid || !bestAsk || bestBid.price < bestAsk.price) {
            break
        }

        const filledQty = Math.min(bestBid.qty, bestAsk.qty)
        totalFilled += filledQty
        bestBid.qty -= filledQty 
        bestAsk.qty -= filledQty

        if (bestAsk.qty === 0) ORDERBOOK[asset]?.asks.splice(0, 1)
        if (bestBid.qty === 0) ORDERBOOK[asset]?.bids.splice(0, 1)
    }

    sortOrderBook(asset)
    
    return totalFilled
}

export function checkBalance(userId: string, asset: string, amount: number): boolean {
    if (!BALANCES.available[userId]) {
        return false;
    } else {
        return (BALANCES.available[userId][asset] || 0) >= amount
    }
}

export function lockedBalance(userId: string, asset: string, amount: number): boolean {
    
    if (!checkBalance(userId, asset, amount)) {
        return false
    }

    const available = BALANCES.available[userId]
    if (available && available[asset]) {
        available[asset] -= amount
    }

    
    if (!BALANCES.locked[userId]) {
        BALANCES.locked[userId] = {}
    }
    
    BALANCES.locked[userId][asset] = (BALANCES.locked[userId][asset] || 0) + amount
    return true
}
