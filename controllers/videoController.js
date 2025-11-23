import ffmpeg from 'fluent-ffmpeg'
import cloudinary from '../config/cloudinary.js'
import { PassThrough } from 'stream'

export const optimizeVideo = async (req, res) => {
  console.log('🎬 Video optimization service started')
  console.time('VIDEO_OPTIMIZATION_TIME')

  const ffmpegInput = new PassThrough()
  const ffmpegOutput = new PassThrough()

  let cloudinaryUpload = null
  let ffmpegProcess = null
  let responseSent = false
  let inputStreamCompleted = false

  // ⭐ New variable to track optimized output size
  let optimizedSize = 0

  const cleanup = (status = 499, message = 'Upload canceled') => {
    if (responseSent) return
    responseSent = true

    console.timeEnd('VIDEO_OPTIMIZATION_TIME')

    try {
      ffmpegProcess?.kill('SIGKILL')
    } catch {}
    try {
      ffmpegInput.destroy()
    } catch {}
    try {
      ffmpegOutput.destroy()
    } catch {}
    try {
      cloudinaryUpload?.end?.()
    } catch {}

    return res.status(status).json({
      success: false,
      message,
    })
  }

  try {
    let receivedBytes = 0

    // ⭐ Track input size
    req.on('data', (chunk) => {
      receivedBytes += chunk.length
    })

    req.on('end', () => {
      console.log(
        `📥 Original video stream received: ${(
          receivedBytes /
          (1024 * 1024)
        ).toFixed(2)} MB`
      )
      inputStreamCompleted = true
    })

    req.on('close', () => {
      console.warn('⚠️ req.close triggered')

      if (inputStreamCompleted && !responseSent) {
        console.log('🔵 Normal close after upload — continue processing')
        return
      }

      cleanup(499, 'Upload canceled upstream')
    })

    req.on('error', (err) => {
      console.error('❌ Request stream error:', err)
      cleanup(500, 'Stream error')
    })

    req.pipe(ffmpegInput)

    cloudinaryUpload = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: 'devtinder/videos',
        chunk_size: 6_000_000,
        timeout: 600000,
      },
      (error, result) => {
        if (responseSent) return

        if (error) {
          console.error('❌ Cloudinary upload error:', error)
          return cleanup(500, 'Cloudinary upload failed')
        }

        // ⭐ Log optimized (final) size from Cloudinary
        console.log(
          `📦 Optimized video size uploaded: ${(
            result.bytes /
            (1024 * 1024)
          ).toFixed(2)} MB`
        )

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

    ffmpegProcess = ffmpeg(ffmpegInput)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset veryfast',
        '-crf 28',
        '-movflags frag_keyframe+empty_moov',
      ])
      .size('1280x?')
      .format('mp4')
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`⚙️ Processing: ${progress.percent.toFixed(2)}%`)
        }
      })
      .on('error', (err) => {
        if (!responseSent) {
          console.error('❌ FFmpeg error:', err.message)
          cleanup(500, 'Video processing failed')
        }
      })
      .on('end', () => {
        console.log('✅ FFmpeg processing completed')
      })
      .pipe(ffmpegOutput, { end: true })

    // ⭐ Count optimized output size before upload
    ffmpegOutput.on('data', (chunk) => {
      optimizedSize += chunk.length
    })

    ffmpegOutput.on('end', () => {
      console.log(
        `📉 Optimized output stream size before Cloudinary: ${(
          optimizedSize /
          (1024 * 1024)
        ).toFixed(2)} MB`
      )
    })

    ffmpegOutput.pipe(cloudinaryUpload)

    ffmpegOutput.on('error', (err) => {
      if (!responseSent) {
        console.error('❌ FFmpeg output error:', err)
        cleanup(500, 'Output error')
      }
    })
  } catch (err) {
    console.error('❌ Unexpected microservice error:', err)
    cleanup(500, 'Server error')
  }
}
