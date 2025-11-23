import sharp from 'sharp'
import streamifier from 'streamifier'
import cloudinary from '../config/cloudinary.js'

export const optimizeImage = async (req, res) => {
  console.log('🖼️ Image optimization service started')
  console.time('IMAGE_OPTIMIZATION_TIME')

  let chunks = []
  let responseSent = false
  let cloudinaryUpload = null
  let inputStreamCompleted = false

  const cleanup = (status = 499, message = 'Upload canceled') => {
    if (responseSent) return
    responseSent = true

    console.timeEnd('IMAGE_OPTIMIZATION_TIME')

    try {
      cloudinaryUpload?.end?.()
    } catch {}

    return res.status(status).json({
      success: false,
      message,
    })
  }

  try {
    req.on('data', (chunk) => {
      chunks.push(chunk)
    })

    req.on('end', async () => {
      inputStreamCompleted = true

      try {
        const buffer = Buffer.concat(chunks)

        console.log(`📥 Image received (${buffer.length} bytes)`)
        console.log('✨ Optimizing image…')

        const optimizedBuffer = await sharp(buffer)
          .resize(1080)
          .webp({ quality: 70 })
          .toBuffer()

        console.log('☁️ Uploading optimized image to Cloudinary…')

        const uploadPromise = () =>
          new Promise((resolve, reject) => {
            cloudinaryUpload = cloudinary.uploader.upload_stream(
              {
                resource_type: 'image',
                folder: 'devtinder/images',
              },
              (error, result) => {
                if (error) return reject(error)
                resolve(result)
              }
            )

            streamifier.createReadStream(optimizedBuffer).pipe(cloudinaryUpload)
          })

        const result = await uploadPromise()

        console.log('☁️ Image upload successful:', result.secure_url)
        console.timeEnd('IMAGE_OPTIMIZATION_TIME')

        if (!responseSent) {
          responseSent = true

          return res.status(200).json({
            success: true,
            url: result.secure_url,
            publicId: result.public_id, // FIXED
            playbackUrl: result.playback_url,
            type: result.resource_type, // FIXED ("image")
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
            duration: result.duration || null,
          })
        }
      } catch (err) {
        console.error('❌ Image optimization error:', err)
        cleanup(500, 'Image processing failed')
      }
    })

    req.on('close', () => {
      if (!inputStreamCompleted && !responseSent) {
        console.warn('⛔ Image upload canceled before completion')
        cleanup(499, 'Upload canceled upstream')
      }
    })

    req.on('error', (err) => {
      console.error('❌ Request stream error:', err)
      cleanup(500, 'Stream error')
    })
  } catch (err) {
    console.error('❌ Unexpected microservice error:', err)
    cleanup(500, 'Server error')
  }
}
