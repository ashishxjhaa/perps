
type OrderEntry = {
    price: number
    qty: number
    userId: string
    orderId: string
}

type OrderBook = {
    [asset: string]: {
        longs: OrderEntry[]
        shorts: OrderEntry[]
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


type Position = {
    [ userId: string ]: { 
        [ asset: string ]: { side: 'long' | 'short', entryPrice: number, qty: number }
    }
}

let POSITIONS: Position = {}


export function ensureAsset(asset: string): void {
    if (!ORDERBOOK[asset]) {
        ORDERBOOK[asset] = { longs: [], shorts: [] }
    }
}

export function addOrderToBook(asset: string, side: 'long' | 'short', price: number, qty: number, userId: string, orderId: string): void {
    ensureAsset(asset)

    const order: OrderEntry = { price, qty, userId, orderId }

    if (side === 'long') {
        ORDERBOOK[asset]?.longs.push( order )
    } else {
        ORDERBOOK[asset]?.shorts.push( order )
    }
    
}

export function sortOrderBook(asset: string): void {
    ORDERBOOK[asset]?.longs.sort((a, b) => b.price - a.price)
    ORDERBOOK[asset]?.shorts.sort((a, b) => a.price - b.price)
}

export function matchOrders(asset: string): number {
    let totalFilled = 0

    while (true) {
        const bestLong = ORDERBOOK[asset]?.longs[0]
        const bestShort = ORDERBOOK[asset]?.shorts[0]

        // stop the loop if no match is possible
        if (!bestLong || !bestShort || bestLong.price < bestShort.price) {
            break
        }

        const filledQty = Math.min(bestLong.qty, bestShort.qty)
        updatePosition(bestLong.userId, asset, 'long', bestShort.price, filledQty)
        updatePosition(bestShort.userId, asset, 'short', bestShort.price, filledQty)
        unlockBalance(bestLong.userId, 'USDC', filledQty * bestShort.price)
        unlockBalance(bestShort.userId, 'USDC', filledQty * bestShort.price)
        totalFilled += filledQty
        bestLong.qty -= filledQty 
        bestShort.qty -= filledQty

        if (bestShort.qty === 0) ORDERBOOK[asset]?.shorts.splice(0, 1)
        if (bestLong.qty === 0) ORDERBOOK[asset]?.longs.splice(0, 1)
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

export function unlockBalance(userId: string, asset: string, amount: number): void {
    if (BALANCES.locked[userId] && BALANCES.locked[userId][asset]) {
        BALANCES.locked[userId][asset] -= amount
        
        if (!BALANCES.available[userId]) {
            BALANCES.available[userId] = {}
        }
        BALANCES.available[userId][asset] = (BALANCES.available[userId][asset] || 0) + amount

    }
}

export function updatePosition(userId: string, asset: string, side: 'long' | 'short', entryPrice: number, qty: number): void {
    if (!POSITIONS[userId]) {
        POSITIONS[userId] = {}
    }

    if (!POSITIONS[userId][asset]) {
        POSITIONS[userId][asset] = { side, entryPrice, qty }
    } else {
        POSITIONS[userId][asset].qty += qty
    }

}
