import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()

import imageRoutes from './routes/imageRoutes.js'
import videoRoutes from './routes/videoRoutes.js'

const app = express()

app.use(cors())

app.use('/optimize/image', imageRoutes)
app.use('/optimize/video', videoRoutes)

app.listen(process.env.PORT, () =>
  console.log(`Optimization service running on port ${process.env.PORT}`)
)
