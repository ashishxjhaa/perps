import { createClient } from 'redis'
import { addOrderToBook, matchOrders } from './lib/orderfunction'

const client = createClient()
await client.connect()

const publisher = createClient()
await publisher.connect()

while (true) {
    const response = await client.brPop('incoming-order', 0)
    if (!response) {
        continue
    }

    const order = JSON.parse(response.element)
    const { type, side, price, qty, asset, userId, identifier } = order

    let filledQty = 0

    if (type === 'limit') {
        addOrderToBook(asset, side, price, qty, userId, identifier)
        filledQty = matchOrders(asset)
    }

    if (type === 'market') {
        if (side === 'buy') {
            addOrderToBook(asset, side, Infinity, qty, userId, identifier)
        } else {
            addOrderToBook(asset, side, 0, qty, userId, identifier)
        }
        filledQty = matchOrders(asset)
    }

    await publisher.lPush(`response-queue-${identifier}`, JSON.stringify({
        identifier,
        filledQty
    }))
}
