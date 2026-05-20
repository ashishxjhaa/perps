import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { createClient } from 'redis'
import { signinSchema, signupSchema } from './utils/authschema'
import { prisma } from './utils/db'
import authMiddleware from './utils/middleware'
import { orderSchema } from './utils/orderschmea'

const client = createClient()
await client.connect()

const publisher = createClient()
await publisher.connect()

const app = express()
app.use(express.json())

app.post('/signup', async (req, res) => {
    try {
        const parsedResult = signupSchema.safeParse(req.body);
        if (!parsedResult.success) {
            return res.status(400).json({
                error: 'All fields required'
            })
        }

        const { username, email, password } = parsedResult.data;

        const existingUser = await prisma.user.findFirst({
            where: {
                email
            }
        })
        if (existingUser) {
            return res.status(400).json({
                error: 'User already exist'
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword
            }
        })

        res.status(201).json({
            message: 'User created successfully'
        })

    } catch (e) {
        res.status(500).json({
            error: 'Signup Failed'
        })
    }
})

app.post('/signin', async (req, res) => {
    try {
        const parsedResult = signinSchema.safeParse(req.body);
        if (!parsedResult.success) {
            return res.status(400).json({
                error: 'All fields required'
            })
        }

        const { email, password } = parsedResult.data;

        const user = await prisma.user.findUnique({
            where: {
                email
            }
        })
        if (!user) {
            return res.status(400).json({
                error: 'User not found'
            })
        }

        const isValidPass = await bcrypt.compare(password, user.password)
        if (!isValidPass) {
            return res.status(400).json({
                error: 'Invalid password'
            })
        }

        const token = jwt.sign({
            userId: user.id
        }, process.env.JWT_SECRET!)

        res.status(200).json({
            token
        })
    } catch (e) {
        res.status(500).json({
            error: 'Signin Failed'
        })
    }
})

app.post('/order', authMiddleware, async (req, res) => {
    const userId = req.userId;

    const parsedResult = orderSchema.safeParse(req.body);
    if (!parsedResult.success) {
        return res.status(400).json({
            error: 'All fields required'
        })
    }

    const { type, side, price, qty, asset } = parsedResult.data;

    let identifier = Math.random()

    await client.lPush('incoming-order', JSON.stringify({
        type, side, price, qty, asset, userId, identifier
    }))

    const returnedData = await publisher.brPop(`response-queue-${identifier}`, 0)
    if (!returnedData) {
        return res.status(500).json({ error: 'No response from engine' })
    }

    const responseData = JSON.parse(returnedData.element)

    res.status(201).json({
        message: 'order placed',
        filledQty: responseData.filledQty
    })
})

app.listen(3000, () => {
    console.log('Server is listening on 3000')
})
