import ffmpeg from 'fluent-ffmpeg'
import cloudinary from '../config/cloudinary.js'
import { PassThrough } from 'stream'

export const optimizeVideo = async (req, res) => {
  console.log('Video optimization service started')

  try {
    const ffmpegInput = new PassThrough()
    const ffmpegOutput = new PassThrough()

    let receivedBytes = 0
    let responseSent = false

    // Monitor incoming stream
    req.on('data', (chunk) => {
      receivedBytes += chunk.length
    })

    req.on('end', () => {
      console.log(`Video stream received: ${receivedBytes} bytes`)
    })

    req.on('error', (err) => {
      console.error('Request stream error:', err)
      if (!responseSent) {
        responseSent = true
        res.status(500).json({
          success: false,
          message: 'Stream error',
        })
      }
    })

    // Pipe request to FFmpeg input
    req.pipe(ffmpegInput)

    // Set up Cloudinary upload
    const cloudinaryUpload = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: 'devtinder/videos',
        timeout: 600000,
        chunk_size: 6_000_000,
      },
      (error, result) => {
        if (responseSent) return

        if (error) {
          console.error('Cloudinary upload error:', error)
          responseSent = true
          return res.status(500).json({
            success: false,
            message: 'Upload failed',
          })
        }

        console.log('Upload successful:', result.secure_url)
        responseSent = true
        res.status(200).json({
          success: true,
          url: result.secure_url,
        })
      }
    )

    // Configure and run FFmpeg
    ffmpeg(ffmpegInput)
      .inputFormat('mp4')
      .videoCodec('libx264')
      .size('1280x?')
      .outputOptions([
        '-preset veryfast',
        '-crf 28',
        '-movflags frag_keyframe+empty_moov',
      ])
      .format('mp4')
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`Processing: ${progress.percent.toFixed(2)}%`)
        }
      })
      .on('error', (err, stdout, stderr) => {
        console.error('FFmpeg error:', err.message)
        if (!responseSent) {
          responseSent = true
          res.status(500).json({
            success: false,
            message: 'Video processing failed',
          })
        }
      })
      .on('end', () => {
        console.log('FFmpeg processing completed')
      })
      .pipe(ffmpegOutput, { end: true })

    // Pipe FFmpeg output to Cloudinary
    ffmpegOutput.pipe(cloudinaryUpload)

    // Handle output stream errors
    ffmpegOutput.on('error', (err) => {
      console.error('Output stream error:', err)
      if (!responseSent) {
        responseSent = true
        res.status(500).json({
          success: false,
          message: 'Processing error',
        })
      }
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    if (!responseSent) {
      res.status(500).json({
        success: false,
        message: 'Server error',
      })
    }
  }
}
