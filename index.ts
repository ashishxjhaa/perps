import { createClient } from 'redis'

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

    if (type === 'limit') {}
    if (type === 'market') {}

    await publisher.lPush(`response-queue-${identifier}`, JSON.stringify({
        identifier,
        filledQty
    }))
}
