import busboy from 'busboy'
import ffmpeg from 'fluent-ffmpeg'
import cloudinary from '../config/cloudinary.js'
import fs from 'fs'
import path from 'path'
import { PassThrough } from 'stream'

export const optimizeVideo = (req, res) => {
  try {
    const tempDir = path.join(process.cwd(), 'temp')
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir)

    const bb = busboy({ headers: req.headers })

    bb.on('file', (fieldname, file, filename) => {
      const tempInputPath = path.join(tempDir, Date.now() + '-' + filename)
      const tempOutputPath = path.join(
        tempDir,
        Date.now() + '-optimized-' + filename
      )

      let originalBytes = 0

      const writeStream = fs.createWriteStream(tempInputPath)

      file.on('data', (chunk) => {
        originalBytes += chunk.length
      })

      file.pipe(writeStream)

      writeStream.on('finish', () => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'video',
            folder: 'devtinder/videos',
            timeout: 600000,
            chunk_size: 6000000,
          },
          (error, result) => {
            if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath)
            if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath)

            if (error) return res.status(500).json({ success: false })

            res.json({ success: true, url: result.secure_url })
          }
        )

        const ffmpegOutput = new PassThrough()
        ffmpegOutput.pipe(uploadStream)

        ffmpeg(tempInputPath)
          .videoCodec('libx264')
          .size('1280x?')
          .outputOptions(['-preset veryfast', '-crf 28'])
          .format('mp4')
          .save(tempOutputPath)
          .on('end', () => {
            fs.createReadStream(tempOutputPath).pipe(ffmpegOutput)
          })
      })
    })

    req.pipe(bb)
  } catch (err) {
    res.status(500).json({ success: false })
  }
}
