import express from 'express'
import { optimizeImage } from '../controllers/imageController.js'

const router = express.Router()

router.post('/', optimizeImage)

export default router
