import ffmpeg from 'fluent-ffmpeg'
import cloudinary from '../config/cloudinary.js'
import { PassThrough } from 'stream'

export const optimizeVideo = async (req, res) => {
  console.log('Video optimization service started')

  // ⭐ Start time
  console.time('VIDEO_OPTIMIZATION_TIME')

  try {
    const ffmpegInput = new PassThrough()
    const ffmpegOutput = new PassThrough()

    let receivedBytes = 0
    let responseSent = false

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
        console.timeEnd('VIDEO_OPTIMIZATION_TIME') // END TIMER ON FAILURE
        res.status(500).json({
          success: false,
          message: 'Stream error',
        })
      }
    })

    req.pipe(ffmpegInput)

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
          console.timeEnd('VIDEO_OPTIMIZATION_TIME')
          return res.status(500).json({
            success: false,
            message: 'Upload failed',
          })
        }

        console.log('Upload successful:', result.secure_url)

        // ⭐ END TIME WHEN EVERYTHING FINISHES
        console.timeEnd('VIDEO_OPTIMIZATION_TIME')

        responseSent = true

        return res.status(200).json({
          success: true,
          url: result.secure_url,
          publicId: result.public_id,
          playbackUrl: result.playback_url,
          type: result.resource_type,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
          duration: result.duration,
        })
      }
    )

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
      .on('error', (err) => {
        console.error('FFmpeg error:', err.message)
        if (!responseSent) {
          responseSent = true
          console.timeEnd('VIDEO_OPTIMIZATION_TIME')
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

    ffmpegOutput.pipe(cloudinaryUpload)

    ffmpegOutput.on('error', (err) => {
      console.error('Output stream error:', err)
      if (!responseSent) {
        responseSent = true
        console.timeEnd('VIDEO_OPTIMIZATION_TIME')
        res.status(500).json({
          success: false,
          message: 'Processing error',
        })
      }
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    console.timeEnd('VIDEO_OPTIMIZATION_TIME')
    if (!responseSent) {
      res.status(500).json({
        success: false,
        message: 'Server error',
      })
    }
  }
}
