import express from 'express'
import { optimizeVideo } from '../controllers/videoController.js'

const router = express.Router()

router.post('/', optimizeVideo)

export default router
