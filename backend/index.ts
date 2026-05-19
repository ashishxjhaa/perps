import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { signinSchema, signupSchema } from './utils/authschema'
import { prisma } from './utils/db'

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

app.listen(3000, () => {
    console.log('Server is listening on 3000')
})
