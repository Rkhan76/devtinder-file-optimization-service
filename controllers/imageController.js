import busboy from 'busboy'
import sharp from 'sharp'
import streamifier from 'streamifier'
import cloudinary from '../config/cloudinary.js'

export const optimizeImage = async (req, res) => {
  try {
    const bb = busboy({ headers: req.headers })

    let fileBuffer = []

    bb.on('file', (fieldname, file, filename, encoding, mimetype) => {
      console.log('Receiving file:', filename)

      // Collect raw file chunks only
      file.on('data', (chunk) => fileBuffer.push(chunk))

      file.on('end', async () => {
        try {
         
          const buffer = Buffer.concat(fileBuffer)

          // Optimize image
          const optimizedBuffer = await sharp(buffer)
            .resize(1080)
            .webp({ quality: 70 })
            .toBuffer()

          // Upload optimized buffer to Cloudinary
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

          return res.json({
            success: true,
            url: uploaded.secure_url,
          })
        } catch (err) {
          console.error('Image optimization error:', err)
          return res.status(500).json({ success: false })
        }
      })
    })

    bb.on('finish', () => {
      console.log('Busboy finished processing form')
    })

    req.pipe(bb)
  } catch (err) {
    console.error('SERVER ERROR:', err)
    return res.status(500).json({ success: false })
  }
}
