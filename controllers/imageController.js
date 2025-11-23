import sharp from 'sharp'
import streamifier from 'streamifier'
import cloudinary from '../config/cloudinary.js'

export const optimizeImage = async (req, res) => {
  try {
    let fileBuffer = []

    console.log('📥 Receiving streamed image...')

    // Collect raw binary chunks
    req.on('data', (chunk) => fileBuffer.push(chunk))

    req.on('end', async () => {
      try {
        const buffer = Buffer.concat(fileBuffer)

        console.log('📦 Image received, size:', buffer.length)

        // Optimize image using sharp
        const optimizedBuffer = await sharp(buffer)
          .resize(1080)
          .webp({ quality: 70 })
          .toBuffer()

        console.log('✨ Optimized image, uploading to Cloudinary...')

        // Upload optimized buffer
        const uploadPromise = () =>
          new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                resource_type: 'image',
                folder: 'devtinder/images',
              },
              (error, result) => {
                if (error) reject(error)
                else resolve(result)
              }
            )

            streamifier.createReadStream(optimizedBuffer).pipe(uploadStream)
          })

        const uploaded = await uploadPromise()

        console.log('☁️ Uploaded:', uploaded.secure_url)

       return res.json({
         success: true,
         url: uploaded.secure_url, // Optimized final URL
         publicId: uploaded.public_id, // Needed for deleting later
         playbackUrl: uploaded.playback_url, // For HLS videos
         type: uploaded.resource_type, // image / video
         width: uploaded.width,
         height: uploaded.height,
         format: uploaded.format,
         bytes: uploaded.bytes,
         duration: uploaded.duration || null,
       })
      } catch (err) {
        console.error('❌ Image optimization error:', err)
        return res.status(500).json({ success: false, error: err.message })
      }
    })
  } catch (err) {
    console.error('❌ SERVER ERROR:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
}
