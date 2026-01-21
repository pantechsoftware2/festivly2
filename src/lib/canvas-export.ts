/**
 * Canvas Export Utilities
 * Handles exporting canvas to PNG/JPG with high resolution and logo watermark
 */

export interface ExportOptions {
  format: 'png' | 'jpg'
  quality?: number // 0-100 for JPG
  scale?: number // multiplier for resolution (default 1 = 1080x1350)
  filename?: string
  logoUrl?: string // Brand logo URL to add as watermark in corner
}

/**
 * Add logo to canvas image (as watermark in corner) - Optimized for performance
 */
export async function addLogoToImage(
  imageDataUrl: string,
  logoUrl: string,
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right',
  logoSize: number = 80 // size in pixels
): Promise<string> {
  // Validate inputs
  if (!imageDataUrl || !logoUrl) {
    throw new Error('Image and logo URLs are required')
  }

  // Helper function to load image with timeout
  const loadImageWithTimeout = (src: string, timeout: number = 5000): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.referrerPolicy = 'no-referrer'
      
      const timeoutId = setTimeout(() => {
        reject(new Error('Image load timeout'))
      }, timeout)
      
      img.onload = () => {
        clearTimeout(timeoutId)
        resolve(img)
      }
      
      img.onerror = () => {
        clearTimeout(timeoutId)
        reject(new Error('Failed to load image'))
      }
      
      img.src = src
    })
  }

  try {
    // Load both images in parallel for better performance
    const [mainImg, logoImg] = await Promise.all([
      loadImageWithTimeout(imageDataUrl, 10000),
      loadImageWithTimeout(logoUrl, 5000)
    ])

    // Create canvas and context
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    // Set canvas size to match main image
    canvas.width = mainImg.width
    canvas.height = mainImg.height

    // Draw main image
    ctx.drawImage(mainImg, 0, 0)

    // Calculate logo position and dimensions with smart resizing
    // Maintain aspect ratio and respect max constraints: 200px width, 150px height
    const padding = 20
    const MAX_LOGO_WIDTH = 200
    const MAX_LOGO_HEIGHT = 150
    
    // Calculate scale to fit both constraints while maintaining aspect ratio
    const scaleToFitWidth = MAX_LOGO_WIDTH / logoImg.width
    const scaleToFitHeight = MAX_LOGO_HEIGHT / logoImg.height
    const scale = Math.min(scaleToFitWidth, scaleToFitHeight, 1) // never upscale
    
    const logoWidth = Math.round(logoImg.width * scale)
    const logoHeight = Math.round(logoImg.height * scale)
    
    let x = padding
    let y = padding
    
    switch (position) {
      case 'top-left':
        x = padding
        y = padding
        break
      case 'top-right':
        x = canvas.width - logoWidth - padding
        y = padding
        break
      case 'bottom-left':
        x = padding
        y = canvas.height - logoHeight - padding
        break
      case 'bottom-right':
        x = canvas.width - logoWidth - padding
        y = canvas.height - logoHeight - padding
        break
    }

    // Draw logo directly without background frame
    ctx.drawImage(logoImg, x, y, logoWidth, logoHeight)

    // Convert canvas to data URL (PNG for lossless quality)
    const resultDataUrl = canvas.toDataURL('image/png')
    
    return resultDataUrl
  } catch (error) {
    // Log error but don't throw - allow image to be downloaded without logo if logo fails
    console.warn('⚠️ Logo addition failed:', error)
    return imageDataUrl
  }
}

/**
 * Export Fabric canvas to image file
 */
export async function exportCanvasToImage(
  canvas: any,
  options: ExportOptions
): Promise<void> {
  try {
    const {
      format = 'png',
      quality = 95,
      scale = 2, // Default 2x for high-res (2160x2700)
      filename = `design-${Date.now()}`,
      logoUrl
    } = options

    console.log(`🖼️ Exporting canvas as ${format.toUpperCase()} (${scale}x scale)...`)

    // Get canvas as data URL
    let dataUrl = canvas.toDataURL({
      format,
      quality: quality / 100,
      multiplier: scale,
      enableRetinaScaling: true,
    })

    // Add logo if provided
    if (logoUrl) {
      console.log(`📌 Adding logo watermark...`)
      dataUrl = await addLogoToImage(dataUrl, logoUrl, 'bottom-right', 120)
    }

    // Convert data URL to blob
    const response = await fetch(dataUrl)
    const blob = await response.blob()

    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.${format}`

    // Trigger download
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    console.log(`✅ Canvas exported successfully: ${filename}.${format}`)
  } catch (error) {
    console.error('❌ Failed to export canvas:', error)
    throw new Error(`Failed to export canvas: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Serialize canvas state to JSON for saving
 */
export function serializeCanvasState(canvas: any): string {
  try {
    const json = JSON.stringify(canvas.toJSON())
    console.log('💾 Canvas state serialized')
    return json
  } catch (error) {
    console.error('❌ Failed to serialize canvas:', error)
    throw new Error('Failed to serialize canvas state')
  }
}

/**
 * Deserialize canvas state from JSON
 */
export async function deserializeCanvasState(
  canvas: any,
  jsonData: string | object
): Promise<void> {
  try {
    let data: any
    if (typeof jsonData === 'string') {
      data = JSON.parse(jsonData)
    } else if (typeof jsonData === 'object' && jsonData !== null) {
      data = jsonData
    } else {
      throw new Error('Invalid canvas state: not a string or object')
    }
    await canvas.loadFromJSON(data, () => {
      canvas.renderAll()
      console.log('🎨 Canvas state loaded')
    })
  } catch (error) {
    console.error('❌ Failed to deserialize canvas:', error, jsonData)
    throw new Error('Failed to load canvas state')
  }
}
